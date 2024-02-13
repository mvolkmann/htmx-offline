export declare type Dog = {
  id: number;
  name: string;
  breed: string;
};

type StringToAny = {[key: string]: any};

type RouteCallback = (
  params: StringToAny,
  request: Request
) => Promise<Response>;

type RouteHandler = (
  path: string,
  handler: RouteCallback,
  options?: StringToAny
) => void;

export declare type RouteMatch = {
  handler: RouteCallback;
  params: StringToAny;
};

type RouterMatchFunction = (
  method: string,
  pathname: string
) => RouteMatch | undefined;

export declare type MyRouter = {
  delete: RouteHandler;
  get: RouteHandler;
  match: RouterMatchFunction;
  patch: RouteHandler;
  post: RouteHandler;
  put: RouteHandler;
};
