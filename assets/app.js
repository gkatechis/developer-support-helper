    var client = ZAFClient.init();
    client.on('app.registered', function recordCheck() {
        let options = {
            url: '/api/sunshine/objects/search',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                query: {
                    type: 'devtixinfo',
                    key: 'dev_platform_feature',
                    contains: '100'
                }
            })
        };

        return client.request(options)
            .then((results) => {
                console.log('yay');
                document.getElementById("resetBtn").style.visibility = "hidden";

            })
            .catch((error) => {
                console.log('boo');
            })
    });