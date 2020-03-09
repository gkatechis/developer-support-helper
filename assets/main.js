    var top_bar = ZAFClient.init();

    let devPlatformValue;
    let complexityValue;
    let addInfoValue;
    let userName;
    let userID;
    let createdRelationshipRecordID;
    let ticketID;

    // Greg note: this is the first thing that is running
    top_bar.on("app.registered", () => {
        currentUser();
        // Listen for event that sidebar apps will be sending.
        top_bar.on("activeTab", (data) => {
            let instance_info = JSON.parse(data);
            currentUser();
            createTicketSidebar(instance_info.instanceGuid, instance_info.location, instance_info.event);
        });

        // Attach handler to existing sidebar instances.
        top_bar.get("instances").then((data) => {
            // var instanceGuids = Object.keys(data.instances);
            Object.keys(data.instances).forEach((instanceGuid) => {
                let location = data.instances[instanceGuid].location;
                if (location === "ticket_sidebar") {
                    createTicketSidebar(instanceGuid, location);
                    // When first displaying agent UI, there should only be one app.
                    setTicketID(instanceGuid, location);
                }
            });
        });

        // Attach handler to new sidebar instances.
        top_bar.on("instance.created", (context) => {
            let instanceGuid = context.instanceGuid;
            let location = context.location;
            if (location === "ticket_sidebar") {
                createTicketSidebar(instanceGuid, location);
                // Sidebar instances of the app are created when first displaying that ticket or user.
                // Update display to new app instance's info.
                setTicketID(instanceGuid, location);
            }
        });
    });

    // This sets the ticket ID
    // Greg note: this along with "setSidebarEventHandler" is called from "top_bar.on("app.registered")"
    function setTicketID(instanceGuid, location) {
        let ticketSidebar = top_bar.instance(instanceGuid);
        // This code will be called on app.registered event of ticket.
        ticketSidebar.get('ticket.id').then((result) => {
            ticketID = result["ticket.id"]
            document.getElementById("sidebar_data").innerHTML = `Ticket ID: ${ticketID}`;
            return ticketID
        })
    };

    // Greg note: this along with "createTicketSidebar" is called from "top_bar.on("app.registered")"
    // This handles the events sent from the sidebar to topbar app
    function createTicketSidebar(instanceGuid, location) {
        // Get sidebar app instance.
        ticketSidebar = top_bar.instance(instanceGuid);
        // Have sidebar app call top_bar app's "activeTab" event on sidebar's "app.activated" and "app.deactivated" events.
        ticketSidebar.on("app.activated", () => {
            top_bar.trigger("activeTab",
                `{"instanceGuid":"${instanceGuid}", "location": "${location}", "event":"activate"}`);
        });
        ticketSidebar.on("app.deactivated", () => {
            top_bar.trigger("activeTab", '{"instanceGuid":"none", "location": "none", "event":"deactivate"}');
        });
    }

    // Sets devtixinfo object values, passes into saveButton function, then creates new object record
    function createObjectData() {
        let newObjectRecord = {
            data: {
                type: "devtixinfo",
                attributes: {
                    dev_platform_feature: parseInt(devPlatformValue),
                    complexity_rating: parseInt(complexityValue),
                    complexity_rating_user_id: userID,
                    additional_info: addInfoValue,
                    ticket_id: ticketID
                }
            }
        }
        return {
            url: '/api/sunshine/objects/records',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(newObjectRecord, function replacer(key, value) {
                var blacklist = ['complexity_rating', 'complexity_rating_user_id']
                return blacklist.indexOf(key) === -1 ? value : undefined
            })
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

    function getRecordData() {
        return top_bar.request(`/api/sunshine/objects/records/zen:ticket:${ticketID}/relationships/tix_to_devtixinfo`)
    }

    function replaceNull(key, value) {

    }

    // Check if relationship record exists for ticket already, if not, creates object record and then relationship record
    function saveButton() {
        // Get text input from form
        if (!$("input[name='devPlatform']:checked").val()) {
            top_bar.invoke('notify', 'Please select a platform tool before saving.', 'error')
        } else {
            getRecordData()
                .then((success) => {
                    if (success.data.length === 0) {
                        addInfoValue = document.getElementById("addlTxt").value;
                        top_bar.request(createObjectData())
                            .then((success) => {
                                createdObjectRecordID = success.data.id
                                console.log("Successfully created record: ", createdObjectRecordID)
                                newRelationshipSettings = createRecordData()
                                return createdObjectRecordID
                            })
                            .then(() => {
                                top_bar.request(newRelationshipSettings)
                                    .then((success) => {
                                        createdRelationshipRecordID = success.data.id
                                        console.log("Successfully created relationship record: ", createdRelationshipRecordID)
                                        top_bar.invoke('notify', 'Record saved, thanks for flagging the ticket!')
                                        return createdRelationshipRecordID
                                    })
                            })
                            .catch((error) => {
                                console.log(error.responseText)
                            })
                    } else {
                        console.log("Relationship already exists, here's the relationship record: ", success.data[0].id, "and here's the target object ID: ", success.data[0].target)
                        top_bar.invoke('notify', 'Relationship record already exists. Check dev console for IDs', 'alert')
                    }
                })
                .catch(error => {
                    console.log("Relationship record creation failed with error ", error)
                })
        }
    };

    // Get radio button values from form
    $(function () {
        $("input:radio[name*='dev']").click(function () {
            devPlatformValue = $("input[type=radio][name=devPlatform]:checked").val();
            complexityValue = $("input[type=radio][name=devComplexity]:checked").val();
        });
    });

    // Set current user name in app
    function currentUser() {
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
    }