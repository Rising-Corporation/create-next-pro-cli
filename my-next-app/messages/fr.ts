import getMergedMessages from "./getMergedMessages";

const messages = await getMergedMessages(import.meta.url);
export default messages;
