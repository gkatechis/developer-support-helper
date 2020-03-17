// ================================================================================================
// TODO
// ================================================================================================
//   Display user that last udpated record (in footer, greyed out)
//   Test on new ticket
//   Create an Explore report and/or Google sheet report
//   Throw error is required custom fields do not exist. Let user know about Postman collection.
//   Figure out to avoid scrolling in app's window from instance to instance
//   Add hot keys?
//   Consider modification: Just capture category (i.e. API, Mobile SDK, ZAF, etc -- is nuance needed?)
//   BUG: Expecting null back on empty fields and getting empty string (i.e. not null) -- so messing up other logic.
//        Set ticket values, save ticket, select 'Clear', save ticket -- ticket values are now "" vs. null


// ================================================================================================
// App initialization and setup
// ================================================================================================

var top_bar = ZAFClient.init();

let userName;
let userID;

let currentUserInfo
let appFieldIDs
let ticketInfo
let activeTicketSidebarClientInstance

let developerSupportArea = 10
let app_field_IDs = {}
let ticket_info = {}

// Greg note: this is the first thing that is run
top_bar.on("app.registered", async () => {

  await getCurrentUser().then((userInfo) => {
    console.log("debug - currentUserInfo:", userInfo)
    currentUserInfo = userInfo
  })

  // Get custom field IDs. These will be used to get/set rating information.
  await getAppTicketFieldIds().then((data) => {
    console.log("debug - custom fields:", data)
    appFieldIDs = data
  })

  // Listen for event that sidebar apps will be sending.
  top_bar.on("activeTab", (eventData) => {
    let eventInfo = JSON.parse(eventData);
    console.log("debug - ticketSidebar event receive:", eventInfo)
    if (eventInfo.event === "activate") {
      activeTicketSidebarClientInstance = top_bar.instance(eventInfo.instanceGuid)
      getDisplayedTicketInfo()
        .then((result) => {
          setCurrentTicketInfo(result)
          setFormData()
          top_bar.invoke('show')
          document.getElementById("current-ticket").innerHTML = `Ticket ID: ${getCurrentTicketId()}`
        })
    } else {
      // Ticket sidebar app has be deactivated.
      // User moved off of ticket. Clear ticket context and close top_bar app.
      blankAllTicketInfo()
      top_bar.invoke('hide')
    }
  })

  // Attach event handlers to existing sidebar instances.
  top_bar.get("instances").then((data) => {
    Object.keys(data.instances).forEach((instanceGuid) => {
      let location = data.instances[instanceGuid].location
      if (location === "ticket_sidebar") {
        createTicketSidebarEventHandlers(instanceGuid, location)
        activeTicketSidebarClientInstance = top_bar.instance(instanceGuid)
        getDisplayedTicketInfo().then((result) => {
          setCurrentTicketInfo(result)
          document.getElementById("current-ticket").innerHTML = `Ticket ID: ${getCurrentTicketId()}`
        })
      }
    })
  })

  // Attach event handlers to new sidebar instances.
  top_bar.on("instance.created", (context) => {
    let instanceGuid = context.instanceGuid;
    let location = context.location;
    if (location === "ticket_sidebar") {
      console.log("debug - ticketSidebar instance.created")
      createTicketSidebarEventHandlers(instanceGuid, location)
      // Sidebar instances of the app are created when first displaying that ticket or user.
      // Update display to new app instance's info.
      activeTicketSidebarClientInstance = top_bar.instance(instanceGuid)
      getDisplayedTicketInfo().then((result) => {
        setCurrentTicketInfo(result)
        setFormData()
        document.getElementById("current-ticket").innerHTML = `Ticket ID: ${getCurrentTicketId()}`
        top_bar.invoke('show')
      })
    }
  })


  top_bar.on('pane.activated', () => {
    console.log("debug - pane.activated")
    getDisplayedTicketInfo()
      .then((result) => {
        setCurrentTicketInfo(result)
        setFormData()
        document.getElementById("current-ticket").innerHTML = `Ticket ID: ${getCurrentTicketId()}`
      })
  })


  top_bar.on('pane.deactivated', () => {
    console.log("debug - pane.deactivated")
    // 
  })

})


// This sets up ticket sidebar events that, when fired, will send information to the top_bar instance.
function createTicketSidebarEventHandlers(instanceGuid, location) {
  // Get sidebar app instance.
  let ticketSidebar = top_bar.instance(instanceGuid)
  
  // Have sidebar app call top_bar app's "activeTab" event on sidebar's "app.activated" and "app.deactivated" events.
  ticketSidebar.on("app.activated", () => {
    console.log("debug - ticketSidebar app.activiated - trigger send")
    top_bar.trigger("activeTab",
      `{"instanceGuid":"${instanceGuid}", "location": "${location}", "event":"activate"}`)
  })

  ticketSidebar.on("app.deactivated", () => {
    console.log("debug - ticketSidebar app.deactivated - trigger send")
    top_bar.trigger("activeTab", '{"instanceGuid":"none", "location": "none", "event":"deactivate"}')
  })
}


// ================================================================================================
// Data getting and setting
// ================================================================================================

function getDisplayedTicketInfo() {  
  return activeTicketSidebarClientInstance
    .get([
      `ticket.customField:custom_field_${appFieldIDs.area}`,
      `ticket.customField:custom_field_${appFieldIDs.feature}`,
      `ticket.customField:custom_field_${appFieldIDs.complexity_rating}`,
      `ticket.customField:custom_field_${appFieldIDs.rating_user_id}`,
      `ticket.customField:custom_field_${appFieldIDs.additional_info}`,
      `ticket.customField:custom_field_${appFieldIDs.updated_by_user_id}`,
      'ticket.id'
    ])
    .then((result) => {
      console.log("debug - Ticket Info:", result)
      return result
    })
    .catch((error) => {
      console.error("debug - ERROR getDisplayedTicketInfo:", error)
    })
}


function blankAllTicketInfo() {
  setCurrentTicketInfo(null)
}


function getCurrentUser() {
  return top_bar.get('currentUser').then((result) => {
    return {id: result.currentUser.id, email: result.currentUser.email, name: result.currentUser.name}
  })
}


function setCurrentTicketInfo(ticketInfo) {
  if (ticketInfo == null) {
    ticket_info["ticket.id"] = null
    ticket_info["area"] = null
    ticket_info["feature"] = null
    ticket_info["complexity_rating"] = null
    ticket_info["rating_user_id"] = null
    ticket_info["additional_info"] = null
    ticket_info["updated_by_user_id"] = null
  } else {  
    ticket_info["ticket.id"] = ticketInfo["ticket.id"]
    ticket_info["area"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.area}`]
    ticket_info["feature"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.feature}`]
    ticket_info["complexity_rating"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.complexity_rating}`]
    ticket_info["rating_user_id"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.rating_user_id}`]
    ticket_info["additional_info"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.additional_info}`]
    ticket_info["updated_by_user_id"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.updated_by_user_id}`]

    console.log('debug - setCurrentTicketInfo:', ticket_info)
  }
}


function setFormData() {

  console.log("debug - setFormData:", ticket_info)

  if (ticket_info["feature"] != null)
    $(`#id-${ticket_info["feature"]}`).prop('checked', true) 
  else 
    $('input[name=feature-area]').prop('checked', false)

  if (ticket_info["complexity_rating"] != null) 
    $(`#complexity${ticket_info["complexity_rating"]}`).prop('checked', true)
  else
    $('input[name=complexity-rating]').prop('checked', false)

  if (ticket_info["rating_user_id"] != null) {
    top_bar.request(`/api/v2/users/${ticket_info["rating_user_id"]}`)
      .then((result) => {
        $('#complexity-user-label').text(result.user.name)
      })
      .catch((error) => {
        console.error("debug - dsapp error", error)
        $('#complexity-user-label').text(`Error: ${error.responseJSON.description}`)
      })
  }
  else
    $('#complexity-user-label').text('')

  if (ticket_info["additional_info"] != null)
    $('#additional-info').val(ticket_info["additional_info"])
  else
    $('#additional-info').val('')
}


function getCurrentTicketId() {
  return ticket_info["ticket.id"]
}


function getAppTicketFieldIds() {
  return top_bar.request('/api/v2/ticket_fields').then((data) => {
    let custom_fields = data.ticket_fields.filter((field) => /dsapp_/.test(field.title))
    let appFieldIDs = {}
    custom_fields.forEach((field) => {
      appFieldIDs[field.title.substr(6)] = field.id
    })
    return appFieldIDs
  })
}

// ================================================================================================
// HTML form actions
// ================================================================================================

function clearButtonClicked() {
  ticket_info["area"] = null
  ticket_info["feature"] = null
  ticket_info["complexity_rating"] = null
  ticket_info["rating_user_id"] = null
  ticket_info["additional_info"] = null
  ticket_info["updated_by_user_id"] = null

  // Reset HTML values
  $('input[name=feature-area]').prop('checked', false)
  $('#additional-info').val('')
  $('input[name=complexity-rating]').prop('checked',false)
  $('#complexity-user-label').text('')
}


function setComplexityRaterToCurrentUser() {
  ticket_info["rating_user_id"] = currentUserInfo.id
  $('#complexity-user-label').text(currentUserInfo.name)
}


function applyButtonClicked() {  
  // Get values from HTML
  ticket_info["area"] = developerSupportArea
  ticket_info["feature"] = $('input:radio[name=feature-area]:checked').val() ? $('input:radio[name=feature-area]:checked').val() : null
  ticket_info["complexity_rating"] = $("input[name=complexity-rating]:checked").val() ? $("input[name=complexity-rating]:checked").val() : null
  ticket_info["rating_user_id"] = ticket_info["complexity_rating"] == null ? null : ticket_info["rating_user_id"]
  ticket_info["additional_info"] = $('#additional-info').val() ? $('#additional-info').val() : null
  ticket_info["updated_by_user_id"] = currentUserInfo.id

  console.log('debug - ticket_info:', ticket_info)

  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.area}`, ticket_info["area"])
  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.feature}`, ticket_info["feature"])
  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.complexity_rating}`, ticket_info["complexity_rating"])
  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.rating_user_id}`, ticket_info["rating_user_id"])
  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.additional_info}`, ticket_info["additional_info"])
  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.updated_by_user_id}`, ticket_info["updated_by_user_id"])

  top_bar.invoke('popover', 'hide')
}


function discardButtonClicked() {
  top_bar.invoke('popover', 'hide')
}
