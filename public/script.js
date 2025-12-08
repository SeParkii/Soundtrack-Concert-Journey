let readyStatus = document.querySelector('#readyStatus')
let notReadyStatus = document.querySelector('#notReadyStatus')
let myForm = document.querySelector('#myForm')
let contentArea = document.querySelector('#contentArea')
let formPopover = document.querySelector('#formPopover')
let createButton = document.querySelector('#createButton')
let formHeading = document.querySelector('#formPopover h2')

// Step elements
const step1 = document.querySelector('#step-1')
const step2 = document.querySelector('#step-2')
const goToSongsBtn = document.querySelector('#goToSongs')
const backToInfoBtn = document.querySelector('#backToInfo')
const skipSongsBtn = document.querySelector('#skipSongsButton')

// Deezer song UI
const songQueryInput = document.querySelector('#songQuery')
const songSearchButton = document.querySelector('#songSearchButton')
const songResultsContainer = document.querySelector('#songResults')
const selectedSongsList = document.querySelector('#selectedSongsList')

// Store selected songs in memory and send with the form
let selectedSongs = []

// ---------- Helpers for steps ----------
const showStep1 = () => {
  step1.hidden = false
  step2.hidden = true
}

const showStep2 = () => {
  step1.hidden = true
  step2.hidden = false
}

// ---------- Form data helper ----------
const getFormData = () => {
  const formData = new FormData(myForm)
  const json = Object.fromEntries(formData)

  // Handle checkboxes, dates, and numbers
  myForm.querySelectorAll('input').forEach(el => {
    const value = json[el.name]
    const isEmpty = !value || value.trim() === ''

    if (el.type === 'checkbox') {
      json[el.name] = el.checked
    } else if (el.type === 'number' || el.type === 'range') {
      json[el.name] = isEmpty ? null : Number(value)
    } else if (el.type === 'date') {
      json[el.name] = isEmpty ? null : new Date(value).toISOString()
    }
  })

  // Attach selected songs to the payload
  json.songs = selectedSongs

  return json
}

// ---------- Deezer search (via backend proxy) ----------
const searchSongs = async (query) => {
  if (!query || !query.trim()) return

  songResultsContainer.innerHTML = '<p>Searching...</p>'

  try {
    // IMPORTANT:
    // This assumes you have a backend route /api/deezer-search
    // that calls: https://api.deezer.com/search?q=${query}
    const response = await fetch(`/api/deezer-search?q=${encodeURIComponent(query)}`)

    if (!response.ok) {
      songResultsContainer.innerHTML = '<p><i>Song search failed.</i></p>'
      return
    }

    const data = await response.json()
    renderSongResults(data.data || [])
  } catch (err) {
    console.error('Deezer search error:', err)
    songResultsContainer.innerHTML = '<p><i>Error searching songs.</i></p>'
  }
}

const renderSongResults = (tracks) => {
  if (!tracks.length) {
    songResultsContainer.innerHTML = '<p><i>No results found.</i></p>'
    return
  }

  const html = tracks.slice(0, 10).map(track => {
    const inSelected = selectedSongs.some(s => s.id === track.id)
    return `
      <article class="song-card">
        <div class="song-main">
          <img src="${track.album.cover_small}" alt="Album cover for ${track.album.title}">
          <div>
            <p class="song-title"><strong>${track.title}</strong></p>
            <p class="song-artist">${track.artist.name}</p>
          </div>
        </div>
        <div class="song-actions">
          ${track.preview
            ? `<audio controls src="${track.preview}"></audio>`
            : `<p><i>No preview available</i></p>`}
          <button
            type="button"
            class="add-song-btn"
            data-track='${JSON.stringify({
              id: track.id,
              title: track.title,
              artist: track.artist.name,
              album: track.album.title,
              cover: track.album.cover_small,
              preview: track.preview
            }).replace(/'/g, "&apos;")}'
            ${inSelected ? 'disabled' : ''}
          >
            ${inSelected ? 'Added' : 'Add'}
          </button>
        </div>
      </article>
    `
  }).join('')

  songResultsContainer.innerHTML = DOMPurify.sanitize(html)

  // Add listeners to "Add" buttons
  songResultsContainer.querySelectorAll('.add-song-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const trackData = JSON.parse(btn.dataset.track.replace(/&apos;/g, "'"))
      if (!selectedSongs.some(s => s.id === trackData.id)) {
        selectedSongs.push(trackData)
        renderSelectedSongs()
        btn.disabled = true
        btn.textContent = 'Added'
      }
    })
  })
}

const renderSelectedSongs = () => {
  if (!selectedSongs.length) {
    selectedSongsList.innerHTML = '<p><i>No songs added yet.</i></p>'
    return
  }

  const html = selectedSongs.map(song => `
    <div class="selected-song" data-id="${song.id}">
      <span>${song.title} – ${song.artist}</span>
      ${song.preview ? `<audio controls src="${song.preview}"></audio>` : ''}
      <button type="button" class="remove-song-btn">Remove</button>
    </div>
  `).join('')

  selectedSongsList.innerHTML = DOMPurify.sanitize(html)

  selectedSongsList.querySelectorAll('.remove-song-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('.selected-song')
      const id = Number(parent.dataset.id)
      selectedSongs = selectedSongs.filter(song => song.id !== id)
      renderSelectedSongs()
    })
  })
}

// ---------- Form submission ----------
myForm.addEventListener('submit', async event => {
  event.preventDefault()
  const data = getFormData()
  await saveItem(data)
  myForm.reset()
  selectedSongs = []
  renderSelectedSongs()
  showStep1()
  formPopover.hidePopover()
})

// Skip songs just submits with whatever we have (often empty)
skipSongsBtn.addEventListener('click', () => {
  myForm.requestSubmit()
})

// ---------- Save item (Create or Update) ----------
const saveItem = async (data) => {
  console.log('Saving:', data)

  const endpoint = data.id ? `/data/${data.id}` : '/data'
  const method = data.id ? 'PUT' : 'POST'

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
      } catch (err) {
        console.error(response.statusText)
        alert('Failed to save: ' + response.statusText)
      }
      return
    }

    const result = await response.json()
    console.log('Saved:', result)
    getData()
  } catch (err) {
    console.error('Save error:', err)
    alert('An error occurred while saving')
  }
}

// ---------- Edit item ----------
const editItem = (data) => {
  console.log('Editing:', data)

  Object.keys(data).forEach(field => {
    const element = myForm.elements[field]
    if (!element) return

    if (element.type === 'checkbox') {
      element.checked = data[field]
    } else if (element.type === 'date') {
      element.value = data[field] ? data[field].substring(0, 10) : ''
    } else {
      element.value = data[field]
    }
  })

  // Load songs if present
  selectedSongs = Array.isArray(data.songs) ? data.songs : []
  renderSelectedSongs()

  formHeading.textContent = 'Edit Concert Ticket'
  showStep1()
  formPopover.showPopover()
}

// ---------- Delete item ----------
const deleteItem = async (id) => {
  if (!confirm('Are you sure you want to delete this ticket?')) {
    return
  }

  const endpoint = `/data/${id}`
  const options = { method: 'DELETE' }

  try {
    const response = await fetch(endpoint, options)

    if (response.ok) {
      const result = await response.json()
      console.log('Deleted:', result)
      getData()
    } else {
      const errorData = await response.json()
      alert(errorData.error || 'Failed to delete item')
    }
  } catch (error) {
    console.error('Delete error:', error)
    alert('An error occurred while deleting')
  }
}

// ---------- Calendar widget ----------
const calendarWidget = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const month = d.toLocaleString('en-CA', { month: 'short', timeZone: 'UTC' })
  const day = d.toLocaleString('en-CA', { day: '2-digit', timeZone: 'UTC' })
  const year = d.toLocaleString('en-CA', { year: 'numeric', timeZone: 'UTC' })
  return `
    <div class="calendar">
      <div class="month">${month}</div>
      <div class="day">${day}</div>
      <div class="year">${year}</div>
    </div>`
}

// ---------- Render ticket card ----------
const renderItem = (item) => {
  const div = document.createElement('div')
  div.classList.add('item-card')
  div.setAttribute('data-id', item.id)

  // songs section
  let songsHtml = ''
  if (Array.isArray(item.songs) && item.songs.length > 0) {
    songsHtml = `
      <section class="songs-section">
        <h4>Songs from this concert</h4>
        <ul>
          ${item.songs.map(song => `
            <li>
              <strong>${song.title}</strong> – ${song.artist}
              ${song.preview ? `<audio controls src="${song.preview}"></audio>` : ''}
            </li>
          `).join('')}
        </ul>
      </section>
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

  div.querySelector('.edit-btn').addEventListener('click', () => editItem(item))
  div.querySelector('.delete-btn').addEventListener('click', () => deleteItem(item.id))

  return div
}

// ---------- Popover fallbacks ----------
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

// ---------- Create button ----------
createButton.addEventListener('click', (e) => {
  e.preventDefault()
  myForm.reset()
  selectedSongs = []
  renderSelectedSongs()
  if (myForm.elements['id']) {
    myForm.elements['id'].value = ''
  }
  formHeading.textContent = 'Add a Concert Ticket'
  showStep1()
  formPopover.showPopover()
})

// ---------- Step navigation ----------
goToSongsBtn.addEventListener('click', () => {
  showStep2()
})

backToInfoBtn.addEventListener('click', () => {
  showStep1()
})

// ---------- Song search events ----------
songSearchButton.addEventListener('click', () => {
  searchSongs(songQueryInput.value)
})

songQueryInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    searchSongs(songQueryInput.value)
  }
})

// ---------- Reset heading on reset ----------
myForm.addEventListener('reset', () => {
  formHeading.textContent = 'Add a Concert Ticket'
  selectedSongs = []
  renderSelectedSongs()
  showStep1()
})

// ---------- Fetch + render all tickets ----------
const getData = async () => {
  try {
    const response = await fetch('/data')

    if (response.ok) {
      readyStatus.style.display = 'block'
      notReadyStatus.style.display = 'none'

      const data = await response.json()
      console.log('Fetched data:', data)

      if (data.length === 0) {
        contentArea.innerHTML = '<p><i>No data found in the database.</i></p>'
        return
      }

      contentArea.innerHTML = ''
      data.forEach(item => {
        const itemDiv = renderItem(item)
        contentArea.appendChild(itemDiv)
      })
    } else {
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

// Initial load
getData()

// Initial selected songs placeholder
renderSelectedSongs()
