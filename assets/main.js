    var top_bar = ZAFClient.init();
    let ticketID;
    let devPlatformValue;
    let complexityValue;
    let userName;
    let userID;
    let ticketSidebar;
    let createdObjectRecordID;
    let createdRelationshipRecordID;

    // Sets devtixinfo object values, passes into saveButton function, then creates new object record
    function createObjectData() {
        let newObjectRecord = {
            data: {
                type: "devtixinfo",
                attributes: {
                    dev_platform_feature: parseInt(devPlatformValue),
                    complexity_rating: parseInt(complexityValue),
                    complexity_rating_user_id: userID,
                    additional_info: "something",
                    ticket_id: ticketID
                }
            }
        }
        return {
            url: '/api/sunshine/objects/records',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(newObjectRecord)
        }
    }

    // Sets tix_to_devtixino relationship values, passed into saveButton function, then creates new relationship record
    function createRecordData() {
        let newRelationshipRecord = {
            data: {
                relationship_type: "tix_to_devtixinfo",
                source: `zen:ticket:${ticketID}`,
                target: createdObjectRecordID
            }
        }
        return {
            url: '/api/sunshine/relationships/records',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(newRelationshipRecord)
        }
    }

    // Check if relationship record exists for ticket already, if not, creates object record and then relationship record
    function saveButton() {
        if (!$("input[name='devPlatform']:checked").val()) {
            top_bar.invoke('notify', 'Please select a platform tool before saving.', 'error')
        } else {
            top_bar.request(`/api/sunshine/objects/records/zen:ticket:${ticketID}/relationships/tix_to_devtixinfo`)
                .then((success) => {
                    if (success.data.length === 0) {
                        top_bar.request(createObjectData())
                            .then((success) => {
                                createdObjectRecordID = success.data.id
                                console.log("Successfully created record: ", createdObjectRecordID)
                                newRelationshipSettings = createRecordData()
                                return createdObjectRecordID
                            })
                            .then((createdObjectRecordID) => {
                                top_bar.request(newRelationshipSettings)
                                    .then((success) => {
                                        createdRelationshipRecordID = success.data.id
                                        console.log("Successfully created relationship record: ", createdRelationshipRecordID)
                                        return createdRelationshipRecordID
                                    })
                            })
                            .catch((error) => {
                                console.log(error)
                            })
                    } else {
                        console.log("Relationship already exists.")
                    }
                })
                .catch(error => {
                    console.log("Relationship record creation failed with error ", error)
                })
        }
    };
    // If sidebar location exists, pass this to the createTicketSidebar function
    top_bar.on('app.registered', function initializeTicketSidebar() {
        top_bar.get("instances")
            .then((data) => {
                // var instanceGuids = Object.keys(data.instances);
                Object.keys(data.instances).forEach((instanceGuid) => {
                    let location = data.instances[instanceGuid].location;
                    if (location === "ticket_sidebar") {
                        createTicketSidebar(instanceGuid, location);
                    }
                })
            })
    });

    // When receiving from initializeTicketSidebar function, create ticket sidebar app instance
    function createTicketSidebar(instanceGuid, location) {
        ticketSidebar = top_bar.instance(instanceGuid)
        // console.log("instance created at ", location);
        setTicketID(ticketSidebar);
    };

    // Now that ticket sidebar has been created, send ticket ID information to global
    function setTicketID() {
        data = ticketSidebar.get('ticket.id')
            .then((data) => {
                ticketID = data["ticket.id"]
                return ticketID
            })
    };

    // Sets form values on button 
    $(function () {
        $("input:radio[name*='dev']").click(function () {
            devPlatformValue = $("input[type=radio][name=devPlatform]:checked").val();
            complexityValue = $("input[type=radio][name=devComplexity]:checked").val();
            if (devPlatformValue && !complexityValue) {} else if (complexityValue && !devPlatformValue) {

            } else if (complexityValue && devPlatformValue) {

            }
        });
    });

    // Set current user name in app
    top_bar.on('app.registered', function user() {
        top_bar.get('currentUser')
            .then((success) => {
                userRecord = {
                    name: success.currentUser.name,
                    id: success.currentUser.id
                }
                return userRecord
            })
            .then((userRecord) => {
                userName = userRecord.name
                userID = userRecord.id
                document.getElementById('currentUserLabel').innerHTML = userName
            })
    })

    // This handles the events sent from the sidebar to topbar app
    function setSidebarEventHandler(instanceGuid, location) {
        // Get sidebar app instance.
        ticketSidebar = top_bar.instance(instanceGuid);
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