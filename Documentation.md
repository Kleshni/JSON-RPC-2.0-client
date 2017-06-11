JSON-RPC 2.0 client 1.2.0
=========================

[JSON-RPC 2.0](http://www.jsonrpc.org/specification) client library for browser Javascript.

Example
-------

An example usage with HTTP as a transport (see [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS)):

```javascript
var address = "http://127.0.0.1:8000/";

var send = function (request, callback) {
	var requester = new XMLHttpRequest();

	var load = function (event) {
		if (this.readyState === 4) {
			if (this.status === 200 && this.getResponseHeader("content-type") === "application/json") {
				callback(this.response);
			} else {
				callback(new Error("Query error"));
			}
		}
	};

	requester.addEventListener("readystatechange", load);
	requester.open("POST", address);
	requester.setRequestHeader("Content-Type", "application/json");
	requester.send(request);
};

var RPC = new JSONRPC20Client(send);

var callback = function (result) {
	console.log(result);
};

var caught = function (error) {
	console.error(error);
};

RPC.callOne(new JSONRPC20Client.Call("add", [1, 2], callback), caught);

RPC.callMany([
	new JSONRPC20Client.Call("add", [1, 2], callback),
	new JSONRPC20Client.Call("div", [1, 0], callback),
	new JSONRPC20Client.Call("get", callback)
], caught);
```

`JSONRPC20Client(send)`
-----------------------

Constructor of a client object. One argument of type `function send(request, callback)` is used for communication with a remote server. The arguments of this callback:

* A JSON encoded request.
* A callback of type `function (response)`. `response` must be a string or an `Error` object in case of a connection error.

### `callOne(call, callback)`

Performs a remote procedure call. Arguments are a `Call` object and an optional callback for a connection and protocol level error handling.

### `callMany(calls, callback)`

Performs several remote procedure calls. Requires a non-empty array of `Call` objects. An additional callback may be specified for a connection and protocol level error handling.

`JSONRPC20Client.Call(method, params, callback)`
------------------------------------------------

A `Call` object constructor. Arguments:

* A method name.
* An object or an array of arguments for the method call. May be omitted.
* A callback of a type `function (result)`. The result may be `null` or an `Object`, `Array`, `String`, `Number`, `Boolean`, or `Error` instance (with `code` and, possibly, `data` fields set). The callback may be omitted, if a notification request is needed.
