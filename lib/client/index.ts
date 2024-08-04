import { z, ZodError, ZodTypeDef } from 'zod';
import test, { APIRequestContext, MatcherReturnType, expect as baseExpect } from '@playwright/test';
import { fromZodIssue } from 'zod-validation-error';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

export class Req {
  private constructor(
    public readonly method: Method,
    public readonly url: string,
    public readonly options?: Parameters<APIRequestContext[typeof method]>[1],
  ) {}
  public static of(method: Method) {
    return (url: string, options?: Parameters<APIRequestContext[typeof method]>[1]) => new Req(method, url, options);
  }
  public static get = Req.of('get');
  public static post = Req.of('post');
  public static put = Req.of('put');
  public static patch = Req.of('patch');
  public static delete = Req.of('delete');
}

export class Res<A> {
  private constructor(
    public readonly status: number,
    public readonly parser: z.ZodType<A, ZodTypeDef, string>,
  ) {}

  public static blank(status: number) {
    return new Res<any>(status, z.any().optional());
  }

  public static text(status: number, regex: RegExp) {
    return new Res<string>(status, z.string().regex(regex));
  }

  public static json<A>(status: number, schema: z.ZodType<A>) {
    return new Res<A>(
      status,
      z
        .string()
        .transform((str, ctx) => {
          try {
            return JSON.parse(str);
          } catch (error) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Body was not JSON',
            });
            return z.never;
          }
        })
        .pipe(schema)
        .transform((x) => x),
    );
  }
}

type Head = {
  url: string;
  status: number;
  headers: { [k: string]: string };
};

type NoResponse = {
  kind: 'NoResponse';
  req: Req;
  error: unknown;
};

type WrongStatus = {
  kind: 'WrongStatus';
  req: Req;
  res: Head & { body?: string };
  actualStatus: number;
  expectedStatus: number;
};

type InvalidBody = {
  kind: 'InvalidBody';
  req: Req;
  res: Head & { body?: string };
  error: ZodError;
};

type Valid<A> = {
  kind: 'Valid';
  req: Req;
  res: Head & { body: A };
};

type HttpResponse<A> = NoResponse | WrongStatus | InvalidBody | Valid<A>;

const safeParse = async <A>(
  apiRequestContext: APIRequestContext,
  req: Req,
  expectedStatus: number,
  bodyParser: z.ZodType<A, ZodTypeDef, string>,
): Promise<HttpResponse<A>> => {
  let apiResponse;
  try {
    apiResponse = await apiRequestContext[req.method](req.url, req.options);
  } catch (error) {
    return {
      kind: 'NoResponse',
      req,
      error,
    };
  }
  const url = apiResponse.url();
  const status = apiResponse.status();
  const headers = apiResponse.headers();
  let text: string = '';
  try {
    text = await apiResponse.text();
  } catch (e) {}
  await apiResponse.dispose();
  if (status !== expectedStatus) {
    return {
      kind: 'WrongStatus',
      req,
      actualStatus: status,
      expectedStatus,
      res: {
        url,
        status,
        headers,
        body: text,
      },
    };
  }
  const parsed = bodyParser.safeParse(text);
  if (!parsed.success) {
    return {
      kind: 'InvalidBody',
      req,
      res: {
        url,
        status,
        headers,
        body: text,
      },
      error: parsed.error,
    };
  }
  return {
    kind: 'Valid',
    req,
    res: {
      url,
      status,
      headers,
      body: parsed.data,
    },
  };
};

const unlines = (...xs: string[]) => xs.join('\n');

const tryPrettyJson = (o: string | undefined | null) => {
  if (o === undefined || o === null) {
    return '';
  }
  try {
    const parsed = JSON.parse(o);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return o;
  }
};

const expect = baseExpect.extend({
  toBeValid(exchange: HttpResponse<unknown>): MatcherReturnType {
    const title = this.utils.matcherHint('toBeValid', undefined, undefined, { isNot: this.isNot });
    switch (exchange.kind) {
      case 'Valid':
        return {
          pass: true,
          message: () => unlines(title, 'Valid', '', 'Pass'),
        };
      case 'NoResponse':
        return {
          pass: false,
          message: () =>
            unlines(
              title,
              '',
              'NoResponse: No Response was received',
              '',
              '# REQUEST',
              `${exchange.req.method.toUpperCase()} ${exchange.req.url}`,
              'Options:',
              '===',
              `${JSON.stringify(exchange.req.options ?? {}, null, 2)}`,
              '===',
              '',
              '# RESPONSE',
              'No Response was received',
            ),
        };
      case 'WrongStatus':
        return {
          pass: false,
          message: () =>
            unlines(
              title,
              '',
              'WrongStatus:',
              `Expected status: ${exchange.expectedStatus}`,
              `Actual status: ${exchange.actualStatus}`,
              '',
              '# REQUEST',
              `${exchange.req.method.toUpperCase()} ${exchange.req.url}`,
              'Options:',
              '===',
              `${JSON.stringify(exchange.req.options ?? {}, null, 2)}`,
              '===',
              '',
              '# RESPONSE',
              `Url: ${exchange.res.url}`,
              'Body:',
              '===',
              `${tryPrettyJson(exchange.res.body)}`,
              '===',
              'Headers:',
              '===',
              `${JSON.stringify(exchange.res.headers, null, 2)}`,
              '===',
            ),
        };
      case 'InvalidBody':
        return {
          pass: false,
          message: () =>
            unlines(
              title,
              '',
              'InvalidBody:',
              ...exchange.error.issues.map((issue) =>
                fromZodIssue(issue, { prefix: '-', prefixSeparator: ' ' }).toString(),
              ),
              '',
              '# REQUEST',
              `${exchange.req.method.toUpperCase()} ${exchange.req.url}`,
              'Options:',
              '===',
              `${JSON.stringify(exchange.req.options ?? {}, null, 2)}`,
              '===',
              '',
              '# RESPONSE',
              `Url: ${exchange.res.url}`,
              'Body:',
              '===',
              `${tryPrettyJson(exchange.res.body)}`,
              '===',
              'Headers:',
              '===',
              `${JSON.stringify(exchange.res.headers, null, 2)}`,
              '===',
            ),
        };
    }
  },
});

export const attempt = (apiRequestContext: APIRequestContext, request: Req) => ({
  expect: async <A>(schema: Res<A>): Promise<A> => {
    return await test.step(`${request.method.toUpperCase()} ${request.url}`, async () => {
      const call = await safeParse(apiRequestContext, request, schema.status, schema.parser);
      if (call.kind === 'Valid') {
        return call.res.body;
      } else {
        expect(call).toBeValid();
        throw new Error('The Playwright expect in the line above should have thrown');
      }
    });
  },
});
