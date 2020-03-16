// Display user that set complexity
  // .then((userRecord) => {
  //   userName = userRecord.name
  //   userID = userRecord.id
  //   document.getElementById('complexity-user-label').innerHTML = userName
  // })
// Display user that last udpated record (in footer, greyed out)
// Test: on new ticket


var top_bar = ZAFClient.init();

let featureAreaValue;
let complexityValue;
let addInfoValue;
let userName;
let userID;
let createdRelationshipRecordID;
let newObjectRecord;

let ticketID;
let currentUserInfo
let appFieldIDs
let ticketInfo
let activeTicketSidebarClientInstance

let developerSupportArea = 10
let app_field_IDs = {}
let ticket_info = {}


// Greg note: this is the first thing that is running
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
          document.getElementById("sidebar_data").innerHTML = `Ticket ID: ${getCurrentTicketId()}`
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
          document.getElementById("sidebar_data").innerHTML = `Ticket ID: ${getCurrentTicketId()}`
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
        document.getElementById("sidebar_data").innerHTML = `Ticket ID: ${getCurrentTicketId()}`
        top_bar.invoke('show')
      })
    }
  })


  top_bar.on('pane.activated', () => {
    console.log("pane.activated")
    getDisplayedTicketInfo()
    setFormData()
  })


  top_bar.on('pane.deactivated', () => {
    console.log("pane.deactivated")
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
    activeTicketSidebarClientInstance = null
  } else {  
    ticket_info["ticket.id"] = ticketInfo["ticket.id"]
    ticket_info["area"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.area}`]
    ticket_info["feature"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.feature}`]
    ticket_info["complexity_rating"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.complexity_rating}`]
    ticket_info["rating_user_id"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.rating_user_id}`]
    ticket_info["additional_info"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.additional_info}`]
    ticket_info["updated_by_user_id"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.updated_by_user_id}`]

    console.log('setCurrentTicketInfo:', ticket_info)
    // TODO: Get 'Set By' user name
    // TODO: Get 'updated by' user name
  }
}


function setFormData() {

  if (ticket_info["feature"] != null)
    $(`#id-${ticket_info["feature"]}`).prop('checked', true) 
  else 
    $('input[name=feature-area]').prop('checked', false)

  if (ticket_info["complexity_rating"] != null) 
    $(`#complexity${ticket_info["complexity_rating"]}`).prop('checked', true)
  else
    $('input[name=complexity-rating]').prop('checked', false)

  if (ticket_info["rating_user_id"] != null)
    $('#complexity-user-label').text(ticket_info["rating_user_id"])
  else
    $('#complexity-user-label').text('')

  if (ticket_info["additional_info"] != null)
    $('#additional-info').val(ticket_info["additional_info"])
  else
    $('#additional-info').val('')

  // Will show 'value' attribute of checked radio button.
  // let y = $("input[name=feature-area]:checked").val())
  // $(`#id-${y}`).prop('checked', true)

  // Radio button
  //  $("input[name=feature-area]").val(ticket_info["area"])
  //!$("input[name='feature-area']:checked").val())

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

function clearButtonClicked() {
  ticket_info["area"] = null
  ticket_info["feature"] = null
  ticket_info["complexity_rating"] = null
  ticket_info["rating_user_id"] = null
  ticket_info["additional_info"] = null
  ticket_info["updated_by_user_id"] = null

  // Reset HTML values
  $('#additional-info').val('')
  $('#complexity-user-label').text('')
  $('input[name=feature-area]').prop('checked', false)
  $("input[name=complexity-rating]").prop('checked',false)
}


function applyButtonClicked() {  
  // console.log("XXX:", $('#additional-info').val() ? $('#additional-info').val() : null)
  // TODO -- get user IDs for complexity rating and who's doing updating.

  // Get values from HTML
  ticket_info["area"] = developerSupportArea
  ticket_info["feature"] = $('input:radio[name=feature-area]:checked').val() ? $('input:radio[name=feature-area]:checked').val() : null
  ticket_info["complexity_rating"] = $("input[name=complexity-rating]:checked").val() ? $("input[name=complexity-rating]:checked").val() : null
  ticket_info["rating_user_id"] = ticket_info["complexity_rating"] == null ? null : 123456
  ticket_info["additional_info"] = $('#additional-info').val() ? $('#additional-info').val() : null
  ticket_info["updated_by_user_id"] = 222222

  console.log('ticket_info:', ticket_info)

  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.area}`, ticket_info["area"])
  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.feature}`, ticket_info["feature"])
  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.complexity_rating}`, ticket_info["complexity_rating"])
  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.rating_user_id}`, ticket_info["rating_user_id"])
  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.additional_info}`, ticket_info["additional_info"])
  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.updated_by_user_id}`, ticket_info["updated_by_user_id"])

  top_bar.invoke('popover', 'hide')
  // ticket_info["area"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.area}`]
  // ticket_info["feature"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.feature}`]
  // ticket_info["complexity_rating"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.complexity_rating}`]
  // ticket_info["rating_user_id"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.rating_user_id}`]
  // ticket_info["additional_info"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.additional_info}`]
  // ticket_info["updated_by_user_id"] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.updated_by_user_id}`]
}


function discardButtonClicked() {

  // Just don't save what the form values are set to.
  // Reset form values to original
  // TODO: top_bar activate should re-read ticket info and populate form.


  top_bar.invoke('popover', 'hide')

}
