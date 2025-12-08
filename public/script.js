let readyStatus = document.querySelector('#readyStatus')
let notReadyStatus = document.querySelector('#notReadyStatus')
let myForm = document.querySelector('#myForm')
let contentArea = document.querySelector('#contentArea')
let formPopover = document.querySelector('#formPopover')
let createButton = document.querySelector('#createButton')
let formHeading = document.querySelector('#formPopover h2')

// 🌟 Step 2 (Songs) elements
let songSearchInput = document.querySelector('#songSearch')
let songSearchButton = document.querySelector('#songSearchButton')
let songResultsContainer = document.querySelector('#songResults')
let selectedSongsList = document.querySelector('#selectedSongsList')

// This will hold all chosen songs for the current event
// Each song object looks like:
// { id: '12345', title: 'Song Name', artist: 'Artist Name', preview: 'https://...' }
let selectedSongs = []

// ------------------------------
// Helpers for songs UI
// ------------------------------

const renderSelectedSongs = () => {
  if (!selectedSongsList) return
  if (!selectedSongs || selectedSongs.length === 0) {
    selectedSongsList.innerHTML = '<li><i>No songs selected.</i></li>'
    return
  }

  selectedSongsList.innerHTML = ''
  selectedSongs.forEach((song, index) => {
    const li = document.createElement('li')
    li.classList.add('selected-song')

    li.innerHTML = `
      <div class="song-info">
        <strong>${song.title}</strong> – ${song.artist}
      </div>
      ${song.preview ? `<audio controls src="${song.preview}"></audio>` : ''}
      <button type="button" class="remove-song" data-index="${index}">
        Remove
      </button>
    `

    const btn = li.querySelector('.remove-song')
    btn.addEventListener('click', () => {
      selectedSongs.splice(index, 1)
      renderSelectedSongs()
    })

    selectedSongsList.appendChild(li)
  })
}

const renderSearchResults = (tracks) => {
  if (!songResultsContainer) return

  if (!tracks || tracks.length === 0) {
    songResultsContainer.innerHTML = '<p><i>No songs found. Try another search.</i></p>'
    return
  }

  const html = tracks.slice(0, 10).map(track => {
    const safeTitle = track.title || 'Untitled'
    const safeArtist = track.artist?.name || 'Unknown Artist'
    const preview = track.preview || ''

    return `
      <div class="song-result" data-track-id="${track.id}">
        <div class="song-main">
          <span class="song-title">${safeTitle}</span>
          <span class="song-artist">– ${safeArtist}</span>
        </div>
        ${preview ? `<audio controls src="${preview}"></audio>` : '<small>No preview available</small>'}
        <button type="button" class="add-song-btn">Add</button>
      </div>
    `
  }).join('')

  songResultsContainer.innerHTML = html

  // Attach "Add" button events
  songResultsContainer.querySelectorAll('.add-song-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const resultDiv = e.target.closest('.song-result')
      const trackId = resultDiv.getAttribute('data-track-id')
      const title = resultDiv.querySelector('.song-title').textContent
      const artist = resultDiv.querySelector('.song-artist').textContent.replace(/^–\s*/, '')
      const audioEl = resultDiv.querySelector('audio')
      const preview = audioEl ? audioEl.src : ''

      // Avoid adding duplicates
      if (!selectedSongs.some(song => song.id === trackId)) {
        selectedSongs.push({ id: trackId, title, artist, preview })
        renderSelectedSongs()
      }
    })
  })
}

const searchDeezer = async () => {
  if (!songSearchInput || !songResultsContainer) return

  const queryText = songSearchInput.value.trim()
  const artistField = document.querySelector('#artist')
  const artistName = artistField ? artistField.value.trim() : ''

  // Build search string: artist + queryText
  let searchString = ''
  if (artistName && queryText) {
    searchString = `${artistName} ${queryText}`
  } else if (artistName && !queryText) {
    searchString = artistName
  } else if (!artistName && queryText) {
    searchString = queryText
  } else {
    alert('Please enter an artist or a song keyword to search.')
    return
  }

  songResultsContainer.innerHTML = '<p>Searching Deezer…</p>'

  try {
    // 🔐 We hit our own backend which then talks to Deezer
    const response = await fetch(`/deezer/search?q=${encodeURIComponent(searchString)}`)
    if (!response.ok) {
      throw new Error('Search failed')
    }
    const data = await response.json()
    const tracks = data.data || []
    renderSearchResults(tracks)
  } catch (err) {
    console.error('Deezer search error:', err)
    songResultsContainer.innerHTML = '<p><i>Could not search Deezer. Please try again later.</i></p>'
  }
}

// Attach search listeners (if elements exist)
if (songSearchButton) {
  songSearchButton.addEventListener('click', searchDeezer)
}

if (songSearchInput) {
  songSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      searchDeezer()
    }
  })
}

// ------------------------------
// Form data helper
// ------------------------------

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

  // Attach songs array (may be empty)
  json.songs = selectedSongs

  return json
}

// ------------------------------
// Form submit: Create or Update
// ------------------------------

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

// ------------------------------
// Edit & Delete
// ------------------------------

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

  // Load songs for this item (if any)
  selectedSongs = Array.isArray(data.songs) ? data.songs : []
  renderSelectedSongs()

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

// ------------------------------
// Rendering items
// ------------------------------

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

  let songsHtml = ''
  if (Array.isArray(item.songs) && item.songs.length > 0) {
    const listHtml = item.songs.map(song => {
      const safeTitle = song.title || 'Untitled'
      const safeArtist = song.artist || 'Unknown Artist'
      const preview = song.preview || ''

      return `
        <li class="song-row">
          <span>${safeTitle} – ${safeArtist}</span>
          ${preview ? `<audio controls src="${preview}"></audio>` : ''}
        </li>
      `
    }).join('')

    songsHtml = `
      <div class="item-songs">
        <h4>🎧 Favourite / Setlist Songs</h4>
        <ul>${listHtml}</ul>
      </div>
    `
  }

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
      <p>${item.notes || ''}</p>
    </section>

    ${songsHtml}

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

// ------------------------------
// Popover helpers & button
// ------------------------------

// ensure the form popover has simple show/hide helpers used elsewhere
if (formPopover) {
  if (!formPopover.showPopover) {
    formPopover.showPopover = function () {
      this.hidden = false
      this.scrollTop = 0
      this.classList.add('open')
    }
  }
  if (!formPopover.hidePopover) {
    formPopover.hidePopover = function () {
      this.hidden = true
      this.classList.remove('open')
    }
  }
}

// Reset the form when the create button is clicked.
createButton.addEventListener('click', (e) => {
  e.preventDefault()
  myForm.reset()                     // clear inputs
  if (myForm.elements['id']) {       // ensure hidden id is cleared
    myForm.elements['id'].value = ''
  }

  // Reset songs
  selectedSongs = []
  if (songResultsContainer) songResultsContainer.innerHTML = ''
  renderSelectedSongs()

  formHeading.textContent = 'Add a Concert Ticket'
  // show the form popover (works with the helpers above)
  formPopover.showPopover()
})

// Revert to the default form title on reset
myForm.addEventListener('reset', () => {
  formHeading.textContent = 'Add a Concert Ticket'
  selectedSongs = []
  if (songResultsContainer) songResultsContainer.innerHTML = ''
  renderSelectedSongs()
})

// ------------------------------
// Fetch + show data from backend
// ------------------------------

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
