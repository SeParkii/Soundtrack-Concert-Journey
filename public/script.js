let readyStatus = document.querySelector('#readyStatus')
let notReadyStatus = document.querySelector('#notReadyStatus')
let myForm = document.querySelector('#myForm')
let contentArea = document.querySelector('#contentArea')
let formPopover = document.querySelector('#formPopover')
let createButton = document.querySelector('#createButton')
let formHeading = document.querySelector('#formPopover h2')

// Get form data and process each type of input
// Prepare the data as JSON with a proper set of types
// e.g. Booleans, Numbers, Dates
const getFormData = () => {
    // FormData gives a baseline representation of the form
    // with all fields represented as strings
    const formData = new FormData(myForm)
    const json = Object.fromEntries(formData)

    // Handle checkboxes, dates, and numbers
    myForm.querySelectorAll('input').forEach(el => {
        const value = json[el.name]
        const isEmpty = !value || value.trim() === ''

        // Represent checkboxes as a Boolean value (true/false)
        if (el.type === 'checkbox') {
            json[el.name] = el.checked
        }
        // Represent number and range inputs as actual numbers
        else if (el.type === 'number' || el.type === 'range') {
            json[el.name] = isEmpty ? null : Number(value)
        }
        // Represent all date inputs in ISO-8601 DateTime format
        else if (el.type === 'date') {
            json[el.name] = isEmpty ? null : new Date(value).toISOString()
        }
    })
    return json
}


// listen for form submissions  
myForm.addEventListener('submit', async event => {
    // prevent the page from reloading when the form is submitted.
    event.preventDefault()
    const data = getFormData()
    await saveItem(data)
    myForm.reset()
    formPopover.hidePopover()
})


// Save item (Create or Update)
const saveItem = async (data) => {
    console.log('Saving:', data)

    // Determine if this is an update or create
    const endpoint = data.id ? `/data/${data.id}` : '/data'
    const method = data.id ? "PUT" : "POST"

    const options = {
        method: method,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    }

    try {
        const response = await fetch(endpoint, options)

        if (!response.ok) {
            try {
                const errorData = await response.json()
                console.error('Error:', errorData)
                alert(errorData.error || response.statusText)
            }
            catch (err) {
                console.error(response.statusText)
                alert('Failed to save: ' + response.statusText)
            }
            return
        }

        const result = await response.json()
        console.log('Saved:', result)


        // Refresh the data list
        getData()
    }
    catch (err) {
        console.error('Save error:', err)
        alert('An error occurred while saving')
    }
}


// Edit item - populate form with existing data
const editItem = (data) => {
    console.log('Editing:', data)

    // Populate the form with data to be edited
    Object.keys(data).forEach(field => {
        const element = myForm.elements[field]
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = data[field]
            } else if (element.type === 'date') {
                // Extract yyyy-mm-dd from ISO date string (avoids timezone issues)
                element.value = data[field] ? data[field].substring(0, 10) : ''
            } else {
                element.value = data[field]
            }
        }
    })

    // Update the heading to indicate edit mode
    formHeading.textContent = 'Edit Concert Ticket'

    // Show the popover
    formPopover.showPopover()
}

// Delete item
const deleteItem = async (id) => {
    if (!confirm('Are you sure you want to delete this ticket?')) {
        return
    }

    const endpoint = `/data/${id}`
    const options = { method: "DELETE" }

    try {
        const response = await fetch(endpoint, options)

        if (response.ok) {
            const result = await response.json()
            console.log('Deleted:', result)
            // Refresh the data list
            getData()
        }
        else {
            const errorData = await response.json()
            alert(errorData.error || 'Failed to delete item')
        }
    } catch (error) {
        console.error('Delete error:', error)
        alert('An error occurred while deleting')
    }
}


const calendarWidget = (date) => {
    if (!date) return ''
    const month = new Date(date).toLocaleString("en-CA", { month: 'short', timeZone: "UTC" })
    const day = new Date(date).toLocaleString("en-CA", { day: '2-digit', timeZone: "UTC" })
    const year = new Date(date).toLocaleString("en-CA", { year: 'numeric', timeZone: "UTC" })
    return ` <div class="calendar">

                <div class="month">${month}</div>
                <div class="day">${day}</div> 
                <div class="year">${year}</div>
            </div>`

}

// Render a single item
const renderItem = (item) => {
    const div = document.createElement('div')
    div.classList.add('item-card')
    div.setAttribute('data-id', item.id)

    const template = /*html*/`
    <div class="item-heading">
      <h3>${item.concertName || 'Untitled Concert'}</h3>
      <div class="microchip-info">
        ${item.artist || '<i>Unknown artist</i>'}
      </div>
    </div>

    <div class="item-info">
        <p><strong>Venue:</strong> ${item.venue || '-'}</p>
        <p><strong>City:</strong> ${item.city || '-'}</p>
        ${calendarWidget(item.concertDate)}
      </div>

      <div class="stats">
        <div class="stat">
          <span>Ticket Type:</span>
          <span>${item.ticketType || '-'}</span>
        </div>
        <div class="stat">
          <span>Price:</span>
          <span>${item.price ? '$' + Number(item.price).toFixed(2) : '-'}</span>
        </div>
      </div>
    </div>

    <div class="item-info">
    <p><strong>Seat:</strong> ${item.seatInfo || '-'}</p>
    <p><strong>Status:</strong> ${item.concertDate ? (new Date(item.concertDate) < new Date() ? 'Past' : 'Upcoming') : '-'}</p>
    </div>

    <section class="description" style="${item.notes ? '' : 'display:none;'}">
      <p>${item.notes}</p>
    </section>

    <div class="item-actions">
      <button class="edit-btn">Edit</button>
      <button class="delete-btn">Delete</button>
    </div>
    `

    div.innerHTML = DOMPurify.sanitize(template)

    // Buttons
    div.querySelector('.edit-btn').addEventListener('click', () => editItem(item))
    div.querySelector('.delete-btn').addEventListener('click', () => deleteItem(item.id))

    return div
}

// ...existing code...

// ensure the form popover has simple show/hide helpers used elsewhere
if (formPopover) {
  if (!formPopover.showPopover) {
    formPopover.showPopover = function () {
      this.hidden = false;
      this.scrollTop = 0;
      this.classList.add('open');
    }
  }
  if (!formPopover.hidePopover) {
    formPopover.hidePopover = function () {
      this.hidden = true;
      this.classList.remove('open');
    }
  }
}

// Reset the form when the create button is clicked.
createButton.addEventListener('click', (e) => {
  e.preventDefault();
  myForm.reset();                     // clear inputs
  if (myForm.elements['id']) {        // ensure hidden id is cleared
    myForm.elements['id'].value = '';
  }
  formHeading.textContent = 'Add a Concert Ticket';
  // show the form popover (works with the helpers above)
  formPopover.showPopover();
});

// ...existing code...


// Revert to the default form title on reset
myForm.addEventListener('reset', () => formHeading.textContent = 'Add a Concert Ticket')

// Reset the form when the create button is clicked. 
createButton.addEventListener('click', myForm.reset())

const getData = async () => {
    try {
        const response = await fetch('/data')

        if (response.ok) {
            readyStatus.style.display = 'block'
            notReadyStatus.style.display = 'none'

            const data = await response.json()
            console.log('Fetched data:', data)

            if (data.length == 0) {
                contentArea.innerHTML = '<p><i>No data found in the database.</i></p>'
                return
            }
            else {
                contentArea.innerHTML = ''
                data.forEach(item => {
                    const itemDiv = renderItem(item)
                    contentArea.appendChild(itemDiv)
                })
            }
        }
        else {
            // If the request failed, show the "not ready" status
            // to inform users that there may be a database connection issue
            notReadyStatus.style.display = 'block'
            readyStatus.style.display = 'none'
            createButton.style.display = 'none'
            contentArea.style.display = 'none'
        }
    } catch (error) {
        console.error('Error fetching data:', error)
        notReadyStatus.style.display = 'block'
    }
}

// Load initial data
getData()
