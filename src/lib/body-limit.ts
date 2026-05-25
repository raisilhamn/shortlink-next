export function checkBodySize(request: Request, maxBytes = 10_000): Response | null {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > maxBytes) {
    return Response.json({ error: "Request body too large" }, { status: 413 });
  }
  return null;
}
