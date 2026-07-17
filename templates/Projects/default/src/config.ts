import { getPublicUrl } from "@/env";

export const port = process.env.PORT || 3000;
export const host = getPublicUrl();
