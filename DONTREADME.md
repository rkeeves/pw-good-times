# pw-good-times

Hmh. Things don't seem to add up.

Maybe the html reporting does some strange heuristic?

I might be dumb though...

Actually what happens (without playwright, just use a browser, postman, curl etc.) is...

You do:

```javascript
fetch('https://jsonplaceholder.typicode.com/users/11', {
  method: 'PUT',
  body: JSON.stringify({
    id: 1,
    title: 'foo',
    body: 'bar',
    userId: 1,
  }),
  headers: {
    'Content-type': 'application/json; charset=UTF-8',
  },
})
```

Server does a `500 Internal Server Error` (btw it is gonna be `text/html; charset=utf-8`), just like God intended.

All is fine and dandy.

The response body will be literally this - once again - just like God intended it:

```
TypeError: Cannot read properties of undefined (reading 'id')
    at update (/app/node_modules/json-server/lib/server/router/plural.js:262:24)
    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)
    at next (/app/node_modules/express/lib/router/route.js:137:13)
    at next (/app/node_modules/express/lib/router/route.js:131:14)
    at Route.dispatch (/app/node_modules/express/lib/router/route.js:112:3)
    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)
    at /app/node_modules/express/lib/router/index.js:281:22
    at param (/app/node_modules/express/lib/router/index.js:354:14)
    at param (/app/node_modules/express/lib/router/index.js:365:14)
    at Function.process_params (/app/node_modules/express/lib/router/index.js:410:3)
```

We are cool, the server choked and vomitted back the stacktrace.

We are cool.

Bbbbbut... if you do this via Playwright, and you put this string into the html report...

Then it will treat it as it happened on your side and will try connecting your source code to it.

But no matter whether [I am dumb](https://youtu.be/zrWoG8IckyE), or the [reporter's heuristic is a bit too eager](https://youtu.be/_nTpsv9PNqo?t=18)...

[Welcome to Programming!](https://youtu.be/s6gNo4-1r6k?t=17)
