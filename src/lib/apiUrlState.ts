type ApiRequest = {
  method: string;
  endpoint: string;
};

export function setApiRequestInUrl(request: ApiRequest | null) {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (request) {
    url.searchParams.set("api_method", request.method);
    url.searchParams.set("api_endpoint", request.endpoint);
  } else {
    url.searchParams.delete("api_method");
    url.searchParams.delete("api_endpoint");
  }

  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}${url.search}${url.hash}`,
  );
}
