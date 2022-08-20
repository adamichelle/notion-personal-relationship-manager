const dotenv = require("dotenv")
const { Client } = require("@notionhq/client")
  
dotenv.config()
const notionClient = new Client({
    auth: process.env.NOTION_AUTH_TOKEN
})