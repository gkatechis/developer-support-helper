// ================================================================================================
// TODO
// ================================================================================================
//   Display user that last udpated record (in footer, greyed out)
//   Create an Explore report and/or Google sheet report
//   Throw error is required custom fields do not exist. Let user know about Postman collection.
//   Figure out to avoid horizontal scrolling in app's window -- I think this is from Garden
//   Add hot keys?
//   Consider modification: Just capture category (i.e. API, Mobile SDK, ZAF, etc -- is nuance needed?)
//   Create a better icon_top_bar.svg image


// ================================================================================================
// App initialization and setup
// ================================================================================================

var top_bar = ZAFClient.init();

// Current agent name and ID.
let currentUserInfo

// Custom ticket field IDs that the app uses.
let appFieldIDs

// This is primarily a top_bar app that references side_bar data. This is the currently displayed
// side_bar ticket app instance.
let activeTicketSidebarClientInstance

// Hardcoding this for now. Could incorporate other areas of product with different IDs in future.
let developerSupportArea = 10

// Contains the data the agent sets in the app that will eventually be applied to the ticket.
let ticket_info = {}

// This is the first thing that is run.
top_bar.on('app.registered', async () => {

  await getCurrentUser().then((userInfo) => {
    console.log('debug - currentUserInfo:', userInfo)
    currentUserInfo = userInfo
  })

  // Get IDs of app's custom ticket fields.
  await getAppTicketFieldIds().then((data) => {
    console.log('debug - custom fields:', data)
    appFieldIDs = data
  })

  // Listen for event that sidebar apps will be sending.
  top_bar.on('activeTab', (eventData) => {
    let eventInfo = JSON.parse(eventData);
    console.log('debug - ticketSidebar event receive:', eventInfo)
    if (eventInfo.event === 'activate') {
      activeTicketSidebarClientInstance = top_bar.instance(eventInfo.instanceGuid)
      getDisplayedTicketInfo()
        .then((result) => {
          setCurrentTicketInfo(result)
          setFormData()
          top_bar.invoke('show')
          document.getElementById('current-ticket').innerHTML = `Ticket ID: ${getCurrentTicketId()}`
        })
    } else {
      // Ticket sidebar app has been deactivated.
      // User moved off of ticket. Clear ticket context and close top_bar app.
      blankAllTicketInfo()
      top_bar.invoke('hide')
    }
  })

  // Attach event handlers to existing sidebar instances.
  top_bar.get('instances').then((data) => {
    Object.keys(data.instances).forEach((instanceGuid) => {
      let location = data.instances[instanceGuid].location
      if (location === 'ticket_sidebar') {
        createTicketSidebarEventHandlers(instanceGuid, location)
        activeTicketSidebarClientInstance = top_bar.instance(instanceGuid)
        getDisplayedTicketInfo().then((result) => {
          setCurrentTicketInfo(result)
          document.getElementById('current-ticket').innerHTML = `Ticket ID: ${getCurrentTicketId()}`
        })
      }
    })
  })

  // Attach event handlers to new sidebar instances.
  top_bar.on('instance.created', (context) => {
    let instanceGuid = context.instanceGuid;
    let location = context.location;
    if (location === 'ticket_sidebar') {
      console.log('debug - ticketSidebar instance.created')
      createTicketSidebarEventHandlers(instanceGuid, location)
      // Sidebar instances of the app are created when first displaying that ticket.
      // Update display to new app instance's info.
      activeTicketSidebarClientInstance = top_bar.instance(instanceGuid)
      getDisplayedTicketInfo().then((result) => {
        setCurrentTicketInfo(result)
        setFormData()
        document.getElementById('current-ticket').innerHTML = `Ticket ID: ${getCurrentTicketId()}`
        top_bar.invoke('show')
      })
    }
  })

  // When agent reopens top_bar, get the ticket's current information.
  top_bar.on('pane.activated', () => {
    console.log('debug - pane.activated')
    getDisplayedTicketInfo()
      .then((result) => {
        setCurrentTicketInfo(result)
        setFormData()
        document.getElementById('current-ticket').innerHTML = `Ticket ID: ${getCurrentTicketId()}`
      })
  })

  top_bar.on('pane.deactivated', () => {
    console.log('debug - pane.deactivated')
  })

})


// This sets up ticket sidebar events that, when fired, will send information to the top_bar instance.
function createTicketSidebarEventHandlers(instanceGuid, location) {
  // Get sidebar app instance.
  let ticketSidebar = top_bar.instance(instanceGuid)
  
  // Have sidebar app call top_bar app's 'activeTab' event on sidebar's 'app.activated' and 'app.deactivated' events.
  ticketSidebar.on('app.activated', () => {
    console.log('debug - ticketSidebar app.activiated - trigger send')
    top_bar.trigger('activeTab',
      `{"instanceGuid":"${instanceGuid}", "location": "${location}", "event":"activate"}`)
  })

  ticketSidebar.on('app.deactivated', () => {
    console.log('debug - ticketSidebar app.deactivated - trigger send')
    top_bar.trigger('activeTab', '{"instanceGuid":"none", "location": "none", "event":"deactivate"}')
  })
}


// ================================================================================================
// Data getting and setting
// ================================================================================================

function getDisplayedTicketInfo() {
  // Returns an array of values, containing the ticket's custom ticket field information.
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
      console.log('debug - Ticket Info:', result)
      return result
    })
    .catch((error) => {
      console.error('debug - ERROR getDisplayedTicketInfo:', error)
    })
}


function blankAllTicketInfo() {
  // This is called when the user changes to a context that does not display a ticket (e.g. admin windows).
  setCurrentTicketInfo(null)
}


function getCurrentUser() {
  return top_bar.get('currentUser').then((result) => {
    return {id: result.currentUser.id, email: result.currentUser.email, name: result.currentUser.name}
  })
}


function setCurrentTicketInfo(ticketInfo) {
  if (ticketInfo == null) {
    ticket_info['ticket.id'] = ''
    ticket_info['area'] = ''
    ticket_info['feature'] = ''
    ticket_info['complexity_rating'] = ''
    ticket_info['rating_user_id'] = ''
    ticket_info['additional_info'] = ''
    ticket_info['updated_by_user_id'] = ''
  } else {  
    ticket_info['ticket.id'] = ticketInfo['ticket.id']
    ticket_info['area'] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.area}`]
    ticket_info['feature'] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.feature}`]
    ticket_info['complexity_rating'] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.complexity_rating}`]
    ticket_info['rating_user_id'] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.rating_user_id}`]
    ticket_info['additional_info'] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.additional_info}`]
    ticket_info['updated_by_user_id'] = ticketInfo[`ticket.customField:custom_field_${appFieldIDs.updated_by_user_id}`]

    console.log('debug - setCurrentTicketInfo:', ticket_info)
  }
}


function setFormData() {

  console.log('debug - setFormData:', ticket_info)

  if (!isEmpty(ticket_info['feature']))
    $(`#id-${ticket_info['feature']}`).prop('checked', true) 
  else 
    $('input[name=feature-area]').prop('checked', false)

  if (!isEmpty(ticket_info['complexity_rating']))
    $(`#complexity${ticket_info['complexity_rating']}`).prop('checked', true)
  else
    $('input[name=complexity-rating]').prop('checked', false)

  if (!isEmpty(ticket_info['rating_user_id'])) {
    top_bar.request(`/api/v2/users/${ticket_info['rating_user_id']}`)
      .then((result) => {
        $('#complexity-user-label').text(result.user.name)
      })
      .catch((error) => {
        console.error('debug - error getting rating_user', error)
        $('#complexity-user-label').text(`Error: ${error}`)
      })
  }
  else
    $('#complexity-user-label').text('')

  if (!isEmpty(ticket_info['additional_info']))
    $('#additional-info').val(ticket_info['additional_info'])
  else
    $('#additional-info').val('')
}


function getCurrentTicketId() {
  return ticket_info['ticket.id']
}


function getAppTicketFieldIds() {
  // Returns a JavaScript object that contains the app's custom ticket field IDs.
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
  ticket_info['area'] = ''
  ticket_info['feature'] = ''
  ticket_info['complexity_rating'] = ''
  ticket_info['rating_user_id'] = ''
  ticket_info['additional_info'] = ''
  ticket_info['updated_by_user_id'] = ''

  setFormData()
}


function setComplexityRaterToCurrentUser() {
  ticket_info['rating_user_id'] = currentUserInfo.id
  $('#complexity-user-label').text(currentUserInfo.name)
}


function applyButtonClicked() {
  if (isEmpty($('input:radio[name=feature-area]:checked').val())
      && (!isEmpty($('input[name=complexity-rating]:checked').val()) || !isEmpty($('#additional-info').val()))
     ) {
    top_bar.invoke('notify', 'Please select a platform tool before saving.', 'error')
    return
  }

  // Get values from HTML
  ticket_info['area'] = developerSupportArea
  ticket_info['feature'] = isEmpty($('input:radio[name=feature-area]:checked').val()) ? '' : $('input:radio[name=feature-area]:checked').val()
  ticket_info['complexity_rating'] = isEmpty($('input[name=complexity-rating]:checked').val()) ? '' : $('input[name=complexity-rating]:checked').val()
  ticket_info['rating_user_id'] = isEmpty(ticket_info['complexity_rating']) ? '' : ticket_info['rating_user_id']
  ticket_info['additional_info'] = isEmpty($('#additional-info').val()) ? '' : $('#additional-info').val()
  ticket_info['updated_by_user_id'] = currentUserInfo.id

  console.log('debug - ticket_info:', ticket_info)

  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.area}`, ticket_info['area'])
  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.feature}`, ticket_info['feature'])
  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.complexity_rating}`, ticket_info['complexity_rating'])
  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.rating_user_id}`, ticket_info['rating_user_id'])
  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.additional_info}`, ticket_info['additional_info'])
  activeTicketSidebarClientInstance.set(`ticket.customField:custom_field_${appFieldIDs.updated_by_user_id}`, ticket_info['updated_by_user_id'])

  top_bar.invoke('popover', 'hide')
}


function discardButtonClicked() {
  top_bar.invoke('popover', 'hide')
}


function isEmpty(variable) {
  // NOTE: A ticket that has not had any values set will have 'null' values in its custom ticket fields.
  //       However, once a custom ticket field has been set, it will never be null again. The best you can
  //       do is set it to an empty string. So consider both null and empty strings as empty.
  return !variable
}
