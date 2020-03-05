    var top_bar = ZAFClient.init();
    let ticketID;

    // let newObjectRecord = {
    //     data: {
    //         type: "devtixinfo",
    //         attributes: {
    //             dev_platform_feature: 
    //         }
    //     }
    // }


    // Set current user name in app

    top_bar.on('app.registered', function user() {
        top_bar.get('currentUser')
            .then((success) => {
                let userRecord = {
                    name: success.currentUser.name,
                    id: success.currentUser.id
                }
                console.log(userRecord.name)
                return userRecord
            })
            .then((userRecord) => {
                document.getElementById('currentUserLabel').innerHTML = userRecord.name
            })
            .catch((error) => {
                console.log(error)
            })
    })
    function testButton() {
        top_bar.request(`/api/sunshine/objects/records/zen:ticket:${ticketID}/relationships/tix_to_devtixinfo`)
            .then((response) => {
                if (response.data.length = 0) {
                      let settings = {
                          url: '/api/sunshine/objects/records',
                          type: 'POST',
                          contentType: 'application/json',
                          data: JSON.stringify(newGoal)
                      }
                    top_bar.request(options)
                } else {
                console.log("Relationship exists already.")
                }
            })
    }

// This handles the events sent from the sidebar to topbar app

    function setSidebarEventHandler(instanceGuid, location) {
        // Get sidebar app instance.
        let ticketSidebar = top_bar.instance(instanceGuid);
        // Have sidebar app call top_bar app's "activeTab" event on sidebar's "app.activated" 
        // and "app.deactivated" events.
        ticketSidebar.on("app.activated", () => {
            top_bar.trigger("activeTab",
                `{"instanceGuid":"${instanceGuid}", "location": "${location}", "event":"activate"}`);
        });
        // ticketSidebar.on("app.deactivated", () => {
        //   top_bar.trigger("activeTab", '{"instanceGuid":"none", "location": "none", "event":"deactivate"}');
        // });
    }

    function displaySidebarInfo(instanceGuid, location) {
        let ticketSidebar = top_bar.instance(instanceGuid);

        // This code will be called on app.registered event of ticket.
        ticketSidebar.get('ticket.id').then((result) => {
            // console.log(result['ticket.id'], "from ", location, "and GUID: ", instanceGuid)
            ticketID = result['ticket.id'];
            document.getElementById("sidebar_data").innerHTML = `Ticket ID: ${ticketID}`;
        })
    }

    top_bar.on("app.registered", () => {
        // Listen for event that sidebar apps will be sending.
        top_bar.on("activeTab", (data) => {
            let instance_info = JSON.parse(data);
            displaySidebarInfo(instance_info.instanceGuid, instance_info.location, instance_info.event);

        });

        // Attach handler to existing sidebar instances.
        top_bar.get("instances").then((data) => {
            // var instanceGuids = Object.keys(data.instances);
            Object.keys(data.instances).forEach((instanceGuid) => {
                let location = data.instances[instanceGuid].location;
                if (location === "ticket_sidebar") {
                    setSidebarEventHandler(instanceGuid, location);
                    // When first displaying agent UI, there should only be one app.
                    displaySidebarInfo(instanceGuid, location);
                }
            });
        });

        // Attach handler to new sidebar instances.
        top_bar.on("instance.created", (context) => {
            let instanceGuid = context.instanceGuid;
            let location = context.location;
            if (location === "ticket_sidebar") {

                setSidebarEventHandler(instanceGuid, location);

                // Sidebar instances of the app are created when first displaying that ticket or user.
                // Update display to new app instance's info.
                displaySidebarInfo(instanceGuid, location);
            }
        });

    });