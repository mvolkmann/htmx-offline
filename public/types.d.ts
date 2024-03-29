export declare type Attributes = Object<string, boolean | number | string>;

export declare type Child = string | number;

export declare type ContentFn = (
  attrs: Attributes | Children,
  children?: Children
) => string;

export declare type SelfClosingFn = (attrs?: Attributes) => string;

export declare type Dog = {
  id: number;
  name: string;
  breed: string;
};

export declare type StringToAny = {[key: string]: any};

export declare type StringToString = {[key: string]: string};

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
