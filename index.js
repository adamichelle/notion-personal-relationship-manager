const dotenv = require("dotenv");
const { Client, APIResponseError } = require("@notionhq/client");
const twilio = require('twilio')
const RestException = require('twilio/lib/base/RestException')
  
dotenv.config()

const notionClient = new Client({
    auth: process.env.NOTION_AUTH_TOKEN
});
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const _extractContactDetails= async (filteredContactsArray) => {
    let details;
    if (filteredContactsArray) {
        const neededPageAndPropertiesIds= filteredContactsArray.map((contactObject) => ({
            pageId: contactObject.id,
            phoneNumberPropertyId: contactObject.properties['Phone Number'].id,
            namePropertyId: contactObject.properties['Name'].id,
            reachOutByPropertyId: contactObject.properties['Reach out by'].id
        }))

        const promises = neededPageAndPropertiesIds.map(async (pageAndPropertyId) => {
            const { pageId, phoneNumberPropertyId, namePropertyId, reachOutByPropertyId } = pageAndPropertyId;

            const phoneNumberProperty = await notionClient.pages.properties.retrieve({
                page_id: pageId,
                property_id: phoneNumberPropertyId
            });

            const reachOutByProperty = await notionClient.pages.properties.retrieve({
                page_id: pageId,
                property_id: reachOutByPropertyId
            });

            const nameProperty = await notionClient.pages.properties.retrieve({
                page_id: pageId,
                property_id: namePropertyId
            });

            return {
                phoneNumber: phoneNumberProperty.phone_number,
                reachOutBy: reachOutByProperty.select.name,
                name: nameProperty.results[0]?.title.text.content
            };
        })

        details = await Promise.all(promises);
    } else {
        throw new Error('You did not provide any list to extract data from.');
    }

    return details;
};

const _sendSMS = async (phoneNumber, messageBody) => {
    return await twilioClient.messages
      .create({body: messageBody, from: process.env.TWILIO_PHONE_NUMBER, to: phoneNumber});
}

(async () => {
    try {
        const response = await notionClient.databases.query({
            database_id: process.env.NOTION_DATABASE_ID,
            filter: {
                property: "Should Reach Out?",
                checkbox: {
                    equals: true,
                },
            },
        });
        
        const details = await _extractContactDetails(response.results);
        for (const detail of details) {
            const { name, reachOutBy, phoneNumber } = detail
            let response;

            if(reachOutBy === 'text') {
                const checkInMessage = `Hi ${name}! How have you been? It has been a while and I wanted to say hi. Let's catch up soon. Have a great day!`;
                response = await _sendSMS(phoneNumber, checkInMessage)
            }  else {
                const reminderMessage = `It's been 3 months since you spoke with ${name}. It's time to reach out! Call ${phoneNumber} to say hi to ${name}`
                response = await _sendSMS(process.env.PHONE_NUMBER_FOR_REMINDERS, reminderMessage)
            }

            console.info(response.sid, response.status)
        };
    } catch (error) {
        if (error instanceof APIResponseError) {
            console.error("Unable to fetch items from database. An error occured from the API client.")
            console.error("Error code: " + error.code)
            console.error(error.message)
        } else if (error instanceof RestException) {
            console.error('Unable to send reminder or message. The following error occured: ');
            console.error(error.message)
        } else {
            console.error(error.message)
        }
    }
})()