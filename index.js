const dotenv = require("dotenv");
const { Client } = require("@notionhq/client");
  
dotenv.config()
const notionClient = new Client({
    auth: process.env.NOTION_AUTH_TOKEN
});

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
    
    console.log(response);
})()