import { redirect } from "next/navigation";

export const GET = (request: Request) => {
  const url = new URL(request.url);
  redirect(url.searchParams.get("continue") ?? "/");
};
