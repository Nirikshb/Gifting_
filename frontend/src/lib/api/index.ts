import { request } from "./client";

export const api = {
  get(path: string) {
    return request("GET", path);
  },

  post(path: string, body: unknown) {
    return request("POST", path, body);
  },

  put(path: string, body: unknown) {
    return request("PUT", path, body);
  },

  patch(path: string, body: unknown) {
    return request("PATCH", path, body);
  },

  delete(path: string) {
    return request("DELETE", path);
  },
};
