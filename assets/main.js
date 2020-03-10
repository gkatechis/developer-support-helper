    var top_bar = ZAFClient.init();

    let devPlatformValue;
    let complexityValue;
    let addInfoValue;
    let userName;
    let userID;
    let createdRelationshipRecordID;
    let ticketID;
    let newObjectRecord;

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
    // Greg note: this along with "setSidebarEventHandler()" and "currentUser()" is called from "top_bar.on("app.registered")"
    function setTicketID(instanceGuid, location) {
        let ticketSidebar = top_bar.instance(instanceGuid);
        // This code will be called on app.registered event of ticket.
        ticketSidebar.get('ticket.id').then((result) => {
            ticketID = result["ticket.id"]
            document.getElementById("sidebar_data").innerHTML = `Ticket ID: ${ticketID}`;
            resetButtonInactive();
            return ticketID
        })
    };
     // Greg note: this along with "createTicketSidebar()" and "setTicketID()" is called from "top_bar.on("app.registered")"
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

    // Greg note: this along with "createTicketSidebar" and "currentUser()" is called from "top_bar.on("app.registered")"
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

    // Sets devtixinfo object values, passes into saveButton(), then creates new object record
    function createObjectData() {
        newObjectRecord = {
            data: {
                type: "devtixinfo",
                attributes: {
                    dev_platform_feature: parseInt(devPlatformValue),
                    complexity_rating: 0,
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
            data: JSON.stringify(newObjectRecord)
        }
    }
    // Sets tix_to_devtixino relationship values, passed into saveButton(), then creates new relationship record
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

    // This is the call to check to see if an existing relationship record already exists for the ticket.
    function getRecordData() {
        return top_bar.request(`/api/sunshine/objects/records/zen:ticket:${ticketID}/relationships/tix_to_devtixinfo`)
    }

    // Check if relationship record exists for ticket already, if not, creates object record and then relationship record
    function saveButton() {
        // When attempting to save, if a dev platform selection is not made, halt the rest and return a growler notification.
        if (!$("input[name='devPlatform']:checked").val()) {
            top_bar.invoke('notify', 'Please select a platform tool before saving.', 'error')
        } else {
            // Does the relationship already exist?
            getRecordData()
                .then((success) => {
                    // This if checks to see if the promise array returns a value indicating that there is an existing relationship. If one exists, this value would be 1 (or possibly more))
                    if (success.data.length === 0) {
                        // Get the additional text value
                        addInfoValue = document.getElementById("addlTxt").value;
                        // Create new object record with the selected form options 
                        top_bar.request(createObjectData())
                            .then((success) => {
                                // If the object record is successfully created, get the newly created object record ID
                                createdObjectRecordID = success.data.id
                                // Return the object record ID in the console
                                console.log("Successfully created record: ", createdObjectRecordID)
                                // set the createRecordData function to a variable so that it can be called in the top_bar request next
                                newRelationshipSettings = createRecordData()
                                return createdObjectRecordID
                            })
                            .then(() => {
                                // Once the object record ID that was created is saved, then create a new relationship record with that object record ID
                                top_bar.request(newRelationshipSettings)
                                    .then((success) => {
                                        // If that is successful, get the newly created relationship record ID
                                        createdRelationshipRecordID = success.data.id
                                        // Return the relationship record ID in the console
                                        console.log("Successfully created relationship record: ", createdRelationshipRecordID)
                                        // Show growler saying thanks for creating the records
                                        top_bar.invoke('notify', 'Records created, thanks for flagging the ticket!')
                                        return createdRelationshipRecordID
                                    })
                            })
                            .catch((error) => {
                                console.log(error)
                            })
                    } else {
                        // If relationship already exists, return both the relationship record ID, as well as the object record ID (noted)
                        console.log("Relationship already exists, here's the relationship record: ", success.data[0].id, "and here's the target object ID: ", success.data[0].target)
                        // Show growler saying that the record already exists and how to find that information in the console.
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

    function resetButtonInactive() {
        ticketSidebar.request(`/api/sunshine/objects/records/zen:ticket:${ticketID}/relationships/tix_to_devtixinfo`)
            .then((success) => {
                if (success.data.length != 0) {
                    console.log(success.data.length);
                        document.getElementById("resetBtn").disabled = true;
                        var x = document.getElementById("resetBtn").disabled;
                    
                } else {
                    console.log("Carry on")
                }
            })
    }