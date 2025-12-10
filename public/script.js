// ---------- BASIC DOM ELEMENTS ----------
const readyStatus = document.querySelector('#readyStatus')
const notReadyStatus = document.querySelector('#notReadyStatus')
const myForm = document.querySelector('#myForm')
const contentArea = document.querySelector('#contentArea')
const formPopover = document.querySelector('#formPopover')
const createButton = document.querySelector('#createButton')
const formHeading = document.querySelector('#formPopover h2')

// Steps
const step1 = document.querySelector('#step-1')
const step2 = document.querySelector('#step-2')
const goToSongsBtn = document.querySelector('#goToSongs')
const backToInfoBtn = document.querySelector('#backToInfo')
const skipSongsBtn = document.querySelector('#skipSongsButton')

// Deezer search UI
const songQueryInput = document.querySelector('#songQuery')
const songSearchButton = document.querySelector('#songSearchButton')
const songResultsContainer = document.querySelector('#songResults')
const selectedSongsList = document.querySelector('#selectedSongsList')

// Keep selected songs in memory
let selectedSongs = []

// ---------- STEP HELPERS ----------
// ---------- STEP HELPERS ----------
const showStep1 = () => {
  if (step1) {
    step1.hidden = false
    step1.style.display = 'grid'   // keep grid layout
  }
  if (step2) {
    step2.hidden = true
    step2.style.display = 'none'
  }
}

const showStep2 = () => {
  if (step1) {
    step1.hidden = true
    step1.style.display = 'none'
  }
  if (step2) {
    step2.hidden = false
    step2.style.display = 'block'
  }
  // make sure user sees the top of step 2
  if (formPopover) formPopover.scrollTop = 0
}


// ---------- FORM DATA HELPER ----------
const getFormData = () => {
  const formData = new FormData(myForm)
  const json = Object.fromEntries(formData)

  // Handle special input types
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

  // Attach songs to payload
  // json.songs = selectedSongs   // remove or comment this line


  return json
}

// ---------- DEEZER: SEARCH + RENDER ----------
const searchSongs = async (query) => {
  if (!query || !query.trim()) return

  songResultsContainer.innerHTML = '<p>Searching...</p>'

  try {
    // This calls your backend proxy route (must exist on server)
    const response = await fetch(`/api/deezer-search?q=${encodeURIComponent(query)}`)

    if (!response.ok) {
      songResultsContainer.innerHTML = '<p><i>Song search failed.</i></p>'
      return
    }

    const data = await response.json()
    const tracks = Array.isArray(data.data) ? data.data : []
    renderSongResults(tracks)
  } catch (err) {
    console.error('Deezer search error:', err)
    songResultsContainer.innerHTML = '<p><i>Song search failed.</i></p>'
  }
}

const renderSongResults = (tracks) => {
  if (!tracks.length) {
    songResultsContainer.innerHTML = '<p><i>No results found.</i></p>'
    return
  }

  const html = tracks.slice(0, 10).map(track => {
    const isAlreadySelected = selectedSongs.some(s => s.id === track.id)

    const trackData = {
      id: track.id,
      title: track.title,
      artist: track.artist?.name || '',
      album: track.album?.title || '',
      cover: track.album?.cover_small || '',
      preview: track.preview || ''
    }

    return `
      <article class="song-card">
        <div class="song-main">
          ${trackData.cover
            ? `<img src="${trackData.cover}" alt="Album cover for ${trackData.album}">`
            : ''}
          <div>
            <p class="song-title"><strong>${trackData.title}</strong></p>
            <p class="song-artist">${trackData.artist}</p>
          </div>
        </div>
        <div class="song-actions">
          ${trackData.preview
            ? `<audio controls src="${trackData.preview}"></audio>`
            : `<p><i>No preview available</i></p>`}
          <button
            type="button"
            class="add-song-btn"
            data-track='${JSON.stringify(trackData).replace(/'/g, '&apos;')}'
            ${isAlreadySelected ? 'disabled' : ''}
          >
            ${isAlreadySelected ? 'Added' : 'Add'}
          </button>
        </div>
      </article>
    `
  }).join('')

  songResultsContainer.innerHTML = DOMPurify.sanitize(html)

  // Wire "Add" buttons
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
  if (!selectedSongsList) return

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

// ---------- SAVE (CREATE / UPDATE) ----------
const saveItem = async (data) => {
  console.log('Saving:', data)

  const endpoint = data.id ? `/data/${data.id}` : '/data'
  const method = data.id ? 'PUT' : 'POST'

  const options = {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  }

  try {
    const response = await fetch(endpoint, options)

    if (!response.ok) {
      let errorText = response.statusText
      try {
        const errorData = await response.json()
        errorText = errorData.error || errorText
      } catch (e) {
        // ignore JSON parse error
      }
      console.error('Save error:', errorText)
      alert('Failed to save: ' + errorText)
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

// ---------- EDIT ----------
const editItem = (data) => {
  console.log('Editing:', data)

  // Populate form fields
  Object.keys(data).forEach(field => {
    const element = myForm.elements[field]
    if (!element) return

    if (element.type === 'checkbox') {
      element.checked = data[field]
    } else if (element.type === 'date') {
      element.value = data[field] ? data[field].substring(0, 10) : ''
    } else {
      element.value = data[field] ?? ''
    }
  })

  // Load songs
  selectedSongs = Array.isArray(data.songs) ? data.songs : []
  renderSelectedSongs()

  formHeading.textContent = 'Edit Concert Ticket'
  showStep1()
  formPopover.showPopover()
}

// ---------- DELETE ----------
const deleteItem = async (id) => {
  if (!confirm('Are you sure you want to delete this ticket?')) return

  const endpoint = `/data/${id}`

  try {
    const response = await fetch(endpoint, { method: 'DELETE' })

    if (response.ok) {
      const result = await response.json()
      console.log('Deleted:', result)
      getData()
    } else {
      let errorText = 'Failed to delete item'
      try {
        const errorData = await response.json()
        errorText = errorData.error || errorText
      } catch (e) {
        // ignore
      }
      alert(errorText)
    }
  } catch (error) {
    console.error('Delete error:', error)
    alert('An error occurred while deleting')
  }
}

// ---------- CALENDAR WIDGET ----------
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
    </div>
  `
}

// ---------- RENDER ONE TICKET CARD ----------
const renderItem = (item) => {
  const div = document.createElement('div')
  div.classList.add('item-card')
  div.setAttribute('data-id', item.id)

  // --- Make sure songs is an array ---
  let songsArray = []
  if (Array.isArray(item.songs)) {
    songsArray = item.songs
  } else if (item.songs && typeof item.songs === 'string') {
    // In case Prisma stored JSON as a string for some reason
    try {
      songsArray = JSON.parse(item.songs)
    } catch (e) {
      console.warn('Could not parse songs JSON:', e)
    }
  }

  // --- Build the songs section HTML ---
  let songsHtml = ''
  if (songsArray.length > 0) {
    songsHtml = `
      <section class="songs-section">
        <h4>Songs from this concert</h4>
        <ul class="songs-list">
          ${songsArray
            .map(
              (song) => `
            <li class="song-item">
              <div class="song-meta">
                <strong>${song.title || 'Unknown title'}</strong>
                <span class="song-artist"> – ${song.artist || 'Unknown artist'}</span>
              </div>
              ${
                song.preview
                  ? `<audio controls src="${song.preview}"></audio>`
                  : `<span class="no-preview"><i>No preview available</i></span>`
              }
            </li>
          `
            )
            .join('')}
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
      <p><strong>Status:</strong> ${
        item.concertDate
          ? new Date(item.concertDate) < new Date()
            ? 'Past'
            : 'Upcoming'
          : '-'
      }</p>
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


// ---------- POPOVER FALLBACKS ----------
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

// ---------- CREATE BUTTON ----------
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

// ---------- FORM SUBMIT ----------
myForm.addEventListener('submit', async (event) => {
  event.preventDefault()
  const data = getFormData()
  await saveItem(data)
  myForm.reset()
  selectedSongs = []
  renderSelectedSongs()
  showStep1()
  formPopover.hidePopover()
})

// ---------- SKIP SONGS (OPTIONAL STEP) ----------
if (skipSongsBtn) {
  skipSongsBtn.addEventListener('click', () => {
    // Submit the form with current data (songs may be empty)
    myForm.requestSubmit()
  })
}

// ---------- STEP NAVIGATION ----------
if (goToSongsBtn) {
  goToSongsBtn.addEventListener('click', () => showStep2())
}

if (backToInfoBtn) {
  backToInfoBtn.addEventListener('click', () => showStep1())
}

// ---------- SONG SEARCH EVENTS ----------
if (songSearchButton) {
  songSearchButton.addEventListener('click', () => {
    searchSongs(songQueryInput.value)
  })
}

if (songQueryInput) {
  songQueryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      searchSongs(songQueryInput.value)
    }
  })
}

// ---------- FORM RESET ----------
myForm.addEventListener('reset', () => {
  formHeading.textContent = 'Add a Concert Ticket'
  selectedSongs = []
  renderSelectedSongs()
  showStep1()
})

// ---------- LOAD DATA FROM /data ----------
const getData = async () => {
  try {
    const response = await fetch('/data')

    if (response.ok) {
      readyStatus.style.display = 'block'
      notReadyStatus.style.display = 'none'

      const data = await response.json()
      console.log('Fetched data:', data)

      if (!data.length) {
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

// ---------- INITIALIZE ----------
getData()
renderSelectedSongs()
showStep1()
