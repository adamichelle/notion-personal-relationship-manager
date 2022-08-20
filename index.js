const dotenv = require("dotenv");
const { Client } = require("@notionhq/client");
  
dotenv.config()
const notionClient = new Client({
    auth: process.env.NOTION_AUTH_TOKEN
});

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

(async () => {
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
    console.log(details)
})()