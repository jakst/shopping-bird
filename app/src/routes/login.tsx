import {
  createServerData$,
  HttpHeader,
  HttpStatusCode,
  redirect,
} from "solid-start/server";
import { REQUIRED_AUTH_HEADER } from "~/auth";

export function routeData() {
  return createServerData$((_, event) => {
    if (event.request.headers.get("authorization") === REQUIRED_AUTH_HEADER) 
      throw redirect("/");
  });
}

export default function Login() {
  return (
    <>
      <HttpHeader name="WWW-Authenticate" value="Basic" />
      <HttpStatusCode code={401} />
    </>
  );
}
