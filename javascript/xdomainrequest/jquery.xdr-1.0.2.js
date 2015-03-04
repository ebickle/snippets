/*!
* jQuery XDomainRequest AJAX Transport Library v1.0.2
*
* Enables XDomainRequest support for Internet Explorer for versions that don't support CORS with XMLHttpRequest.
*   IE7 and below: Not supported.
*   IE8: Supported when InPrivate Browsing is disabled.
*   IE9: Supported.
*   IE10: Supported, but not used. IE10 supports XMLHttpRequest CORS.
*   IE11 and above: Not supported. IE11 removes XDomainRequest in Edge mode.
* 
* This is free and unencumbered software released into the public domain.
* 
* Anyone is free to copy, modify, publish, use, compile, sell, or
* distribute this software, either in source code form or as a compiled
* binary, for any purpose, commercial or non-commercial, and by any
* means.
* 
* In jurisdictions that recognize copyright laws, the author or authors
* of this software dedicate any and all copyright interest in the
* software to the public domain. We make this dedication for the benefit
* of the public at large and to the detriment of our heirs and
* successors. We intend this dedication to be an overt act of
* relinquishment in perpetuity of all present and future rights to this
* software under copyright law.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
* IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
* OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
* ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
* OTHER DEALINGS IN THE SOFTWARE.
*/
(function (jQuery) {
    // The XDomainRequest objects will be stored in a global variable to prevent an
    // IE bug that causes the requests to be garbage collected while they're in progress.
    var xdrRequests = [];

    function corsSupported() {
        try {
            return typeof XMLHttpRequest !== "undefined" && ("withCredentials" in new XMLHttpRequest());
        }
        catch (e) {
            return false;
        }
    }

    if (typeof XDomainRequest !== "undefined" && !corsSupported()) {
        jQuery.ajaxTransport("+*", function (options, originalOptions, jqXHR) {
            var xdr, completed;

            if (options.async && options.crossDomain) {
                function setCompletion() {
                    completed = true;

                    if (xdr) {
                        // Remove from global variable.
                        var arrayIndex = jQuery.inArray(xdr, xdrRequests);
                        if (arrayIndex >= 0) {
                            xdrRequests.splice(arrayIndex, 1);
                        }

                        // Unhook event handlers.
                        xdr.onload = null;
                        xdr.onerror = null;
                        xdr.ontimeout = null;
                        xdr.onprogress = null;
                    }
                }

                return {
                    send: function (headers, complete) {
                        var timeout = options.xdrTimeout || 60000; // 60 seconds by default.

                        xdr = new XDomainRequest();
                        xdr.timeout = timeout;
                        xdr.open(options.type, options.url);

                        // Listen to events.
                        // All of the events must be non-null or random failures will occur.
                        xdr.onload = function () {
                            if (!completed) {
                                setCompletion();
                                complete(
                                    200,
                                    "OK",
                                    typeof xdr.responseText === "string" ? {
                                        text: xdr.responseText
                                    } : undefined,
                                    "Content-Type: " + xdr.contentType
                                );
                            }
                        }
                        xdr.onerror = function () {
                            if (!completed) {
                                setCompletion();
                                complete(500, "XDomainRequest Error");
                            }
                        }
                        xdr.ontimeout = function () {
                            if (!completed) {
                                setCompletion();
                                complete(500, "XDomainRequest Timeout");
                            }
                        }
                        xdr.onprogress = function () { };

                        // Send the request.
                        xdr.send(((options.hasContent && options.data) || null));

                        // Keep a reference to the XDomainRequest object around to avoid.
                        // IE8's buggy garbage collector from destroying it.
                        xdrRequests.push(xdr);
                    },

                    abort: function () {
                        if (xdr && !completed) {
                            setCompletion();
                            xdr.abort();
                        }
                    }
                };
            }
        });
    }
})(jQuery);
