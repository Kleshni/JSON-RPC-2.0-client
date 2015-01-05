var JSONRPC20Client;

(function () {
	var Call = function (method, params, callback) {
		this.method = method;
		this.params = params;

		if (2 in arguments) {
			this.callback = callback;
		}
	};

	JSONRPC20Client = function (send) {
		this.Call = Call; // Compatibility

		var createIDString = function () {
			return "{xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx}".replace(/[xy]/g, function (match) {
				var nibble = ~~(Math.random() * 16);
				return (match == "x" ? nibble : (nibble & 0x3 | 0x8)).toString(16);
			});
		};

		var parseResponse = function (response) {
			if (response instanceof Error) {
				throw response;
			} else {
				return JSON.parse(response);
			}
		};

		var checkErrorFormat = function (error) {
			var keysCount = Object.keys(error).length;

			return (
				typeof error.code == "number" && error.code % 1 == 0 &&
				typeof error.message == "string" &&
				(keysCount == 2 || keysCount == 3 && "data" in error)
			);
		};

		var checkResponseFormat = function (response, expected) {
			return (
				response.jsonrpc === "2.0" &&
				"id" in response && (response.id === null || response.id in expected) &&
				("result" in response || "error" in response && checkErrorFormat(response.error)) &&
				Object.keys(response).length == 3
			);
		};

		var processResponse = function (response, expected) {
			var result;

			if (checkResponseFormat(response, expected)) {
				if ("error" in response) {
					var error = new Error(response.error.message);

					error.code = response.error.code;
					error.data = response.error.data;

					result = error;
				} else {
					result = response.result;
				}
			} else {
				throw Error("Invalid server response");
			}

			if (response.id === null) {
				if (result instanceof Error) {
					throw result;
				} else {
					throw new Error("Invalid server response");
				}
			} else if (response.id in expected) {
				var call = expected[response.id];

				delete expected[response.id];

				call.result = result;

				return call;
			} else {
				throw new Error("Invalid server response");
			}
		};

		this.callOne = function (call, caught) {
			var expected = Object.create(null);

			var request = {
				"jsonrpc": "2.0",
				"method": call.method,
				"params": call.params
			};

			if ("callback" in call) {
				request.id = createIDString();
				expected[request.id] = call;
			}

			caught = 1 in arguments ? caught : new Function();

			var receive = function (data) {
				var processed;

				if (Object.keys(expected).length != 0) {
					var response;

					try {
						response = parseResponse(data);
					} catch (exception) {
						caught(exception);

						return;
					}

					try {
						processed = processResponse(response, expected);
					} catch (exception) {
						caught(exception);

						return;
					}
				}

				if (processed !== undefined) {
					processed.callback(processed.result);
				}
			};

			send(JSON.stringify(request), receive);
		};

		this.callMany = function (calls, caught) {
			var expected = Object.create(null);
			var request = [];

			for (var i = 0; i < calls.length; ++i) {
				var temp = {
					"jsonrpc": "2.0",
					"method": calls[i].method,
					"params": calls[i].params
				};

				if ("callback" in calls[i]) {
					temp.id = createIDString();
					expected[temp.id] = calls[i];
				}

				request.push(temp);
			}

			caught = 1 in arguments ? caught : new Function();

			var receive = function (response) {
				var processed = [];

				if (Object.keys(expected).length != 0) {
					try {
						response = parseResponse(response);
					} catch (exception) {
						caught(exception);

						return;
					}

					if (response instanceof Array && response.length > 0) {
						for (var i = 0; i < response.length; ++i) {
							try {
								processed.push(processResponse(response[i], expected));
							} catch (exception) {
								caught(exception);

								return;
							}
						}
					} else if (response instanceof Object && response !== null) {
						try {
							processed.push(processResponse(response, expected));
						} catch (exception) {
							caught(exception);

							return;
						}
					} else {
						caught("Invalid server response");

						return;
					}

					if (Object.keys(expected).length != 0) {
						caught("Invalid server response");

						return;
					}
				}

				for (var i = 0; i < processed.length; ++i) {
					processed[i].callback(processed[i].result);
				}
			};

			send(JSON.stringify(request), receive);
		};
	};

	JSONRPC20Client.Call = Call;
})();
