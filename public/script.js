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

// ============================
// STEP HELPERS
// ============================
const showStep1 = () => {
  if (!step1 || !step2) return
  step1.hidden = false
  step1.style.display = 'grid'   // keep grid layout
  step2.hidden = true
  step2.style.display = 'none'
}

const showStep2 = () => {
  if (!step1 || !step2) return
  step1.hidden = true
  step1.style.display = 'none'
  step2.hidden = false
  step2.style.display = 'block'

  if (formPopover) formPopover.scrollTop = 0
}

// ============================
// FORM DATA HELPER
// ============================
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
  json.songs = selectedSongs

  return json
}

// ============================
// DEEZER: SEARCH + RENDER
// ============================
const searchSongs = async (query) => {
  if (!query || !query.trim()) return

  songResultsContainer.innerHTML = '<p>Searching...</p>'

  try {
    // Treat user input as ARTIST NAME:
    const advancedQuery = `artist:"${query.trim()}"`

    const response = await fetch(
      `/api/deezer-search?q=${encodeURIComponent(advancedQuery)}`
    )

    if (!response.ok) {
      songResultsContainer.innerHTML = '<p><i>Song search failed.</i></p>'
      return
    }

    const data = await response.json()
    const tracks = Array.isArray(data.data) ? data.data : []

    console.log('Deezer returned', tracks.length, 'tracks for', query)
    renderSongResults(tracks)
  } catch (err) {
    console.error('Deezer search error:', err)
    songResultsContainer.innerHTML = '<p><i>Song search failed.</i></p>'
  }
}

// Render search results – audio created with JS, no time limit in our code
const renderSongResults = (tracks) => {
  if (!tracks.length) {
    songResultsContainer.innerHTML = '<p><i>No results found.</i></p>'
    return
  }

  songResultsContainer.innerHTML = ''

  tracks.forEach(track => {
    const isAlreadySelected = selectedSongs.some(s => s.id === track.id)

    const previewUrl = track.preview
      ? track.preview.replace(/^http:\/\//, 'https://')
      : ''

    const trackData = {
      id: track.id,
      title: track.title,
      artist: track.artist?.name || '',
      album: track.album?.title || '',
      cover: track.album?.cover_small || '',
      preview: previewUrl
    }

    const card = document.createElement('article')
    card.className = 'song-card'

    // ---- TOP: cover + title + artist ----
    const main = document.createElement('div')
    main.className = 'song-main'

    if (trackData.cover) {
      const img = document.createElement('img')
      img.src = trackData.cover
      img.alt = `Album cover for ${trackData.album}`
      main.appendChild(img)
    }

    const infoBox = document.createElement('div')
    const titleP = document.createElement('p')
    titleP.className = 'song-title'
    titleP.innerHTML = `<strong>${trackData.title}</strong>`

    const artistP = document.createElement('p')
    artistP.className = 'song-artist'
    artistP.textContent = trackData.artist

    infoBox.appendChild(titleP)
    infoBox.appendChild(artistP)
    main.appendChild(infoBox)
    card.appendChild(main)

    // ---- BOTTOM: audio + button ----
    const actions = document.createElement('div')
    actions.className = 'song-actions'

    if (trackData.preview) {
      const audio = document.createElement('audio')
      audio.controls = true
      audio.preload = 'auto'     // allow full preview buffering
      audio.src = trackData.preview

      // optional debug: see real duration (~30s)
      audio.addEventListener('loadedmetadata', () => {
        console.log('Preview duration for', trackData.title, ':', audio.duration)
      })

      actions.appendChild(audio)
    } else {
      const noPreview = document.createElement('p')
      noPreview.innerHTML = '<i>No preview available</i>'
      actions.appendChild(noPreview)
    }

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'add-song-btn'
    btn.textContent = isAlreadySelected ? 'Added' : 'Add'
    btn.disabled = isAlreadySelected
    btn.dataset.track = JSON.stringify(trackData)

    btn.addEventListener('click', () => {
      const t = JSON.parse(btn.dataset.track)
      if (!selectedSongs.some(s => s.id === t.id)) {
        selectedSongs.push(t)
        renderSelectedSongs()
        btn.disabled = true
        btn.textContent = 'Added'
      }
    })

    actions.appendChild(btn)
    card.appendChild(actions)

    songResultsContainer.appendChild(card)
  })
}

// ============================
// SELECTED SONGS LIST
// ============================
const renderSelectedSongs = () => {
  if (!selectedSongsList) return

  selectedSongsList.innerHTML = ''

  if (!selectedSongs.length) {
    selectedSongsList.innerHTML = '<p><i>No songs added yet.</i></p>'
    return
  }

  selectedSongs.forEach(song => {
    const wrapper = document.createElement('div')
    wrapper.className = 'selected-song'
    wrapper.dataset.id = song.id

    const label = document.createElement('span')
    label.textContent = `${song.title} – ${song.artist}`
    wrapper.appendChild(label)

    if (song.preview) {
      const audio = document.createElement('audio')
      audio.controls = true
      audio.preload = 'auto'
      audio.src = song.preview.replace(/^http:\/\//, 'https://')

      audio.addEventListener('loadedmetadata', () => {
        console.log('Selected preview duration:', audio.duration)
      })

      wrapper.appendChild(audio)
    }

    const removeBtn = document.createElement('button')
    removeBtn.type = 'button'
    removeBtn.className = 'remove-song-btn'
    removeBtn.textContent = 'Remove'
    removeBtn.addEventListener('click', () => {
      const id = Number(wrapper.dataset.id)
      selectedSongs = selectedSongs.filter(s => s.id !== id)
      renderSelectedSongs()
    })

    wrapper.appendChild(removeBtn)
    selectedSongsList.appendChild(wrapper)
  })
}

// ============================
// SAVE (CREATE / UPDATE)
// ============================
const saveItem = async (data) => {
  console.log('Saving:', data)

  const endpoint = data.id ? `/data/${data.id}` : '/data'
  const method = data.id ? 'PUT' : 'POST'

  const options = {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  }

  try {
    const response = await fetch(endpoint, options)

    if (!response.ok) {
      let errorText = response.statusText
      let errorData = null

      try {
        errorData = await response.json()
        errorText = errorData.details || errorData.error || errorText
      } catch (e) {
        // ignore JSON parse error
      }

      console.error('Save error (full):', errorData || errorText)
      alert(
        'Failed to save:\n' +
        (errorData ? JSON.stringify(errorData, null, 2) : errorText)
      )
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

// ============================
// EDIT
// ============================
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
      element.value = data[field] ?? ''
    }
  })

  selectedSongs = Array.isArray(data.songs) ? data.songs : []
  renderSelectedSongs()

  formHeading.textContent = 'Edit Concert Ticket'
  showStep1()
  formPopover.showPopover()
}

// ============================
// DELETE
// ============================
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

// ============================
// CALENDAR WIDGET
// ============================
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

// ============================
// RENDER ONE TICKET CARD
// ============================
const renderItem = (item) => {
  const div = document.createElement('div')
  div.classList.add('item-card')
  div.setAttribute('data-id', item.id)

  // Make sure songs is an array
  let songsArray = []
  if (Array.isArray(item.songs)) {
    songsArray = item.songs
  } else if (item.songs && typeof item.songs === 'string') {
    try {
      songsArray = JSON.parse(item.songs)
    } catch (e) {
      console.warn('Could not parse songs JSON:', e)
    }
  }

  // Poster images HTML
  const imageParts = []
  if (item.posterUrl) {
    imageParts.push(`
      <figure class="concert-image main-image">
        <img src="${item.posterUrl}" alt="Concert image for ${item.concertName || 'concert'}">
      </figure>
    `)
  }
  if (item.posterUrl2) {
    imageParts.push(`
      <figure class="concert-image secondary-image">
        <img src="${item.posterUrl2}" alt="Second concert image for ${item.concertName || 'concert'}">
      </figure>
    `)
  }
  const imagesHtml = imageParts.join('')

  const template = /* html */`
    <div class="item-heading">
      <h3>${item.concertName || 'Untitled Concert'}</h3>
      <div class="microchip-info">
        ${item.artist || '<i>Unknown artist</i>'}
      </div>
    </div>

    <div class="top-row">
      <div class="top-row-left">
        <p><strong>Venue:</strong> ${item.venue || '-'}</p>
        <p><strong>City:</strong> ${item.city || '-'}</p>
        <p><strong>Ticket Type:</strong> ${item.ticketType || '-'}</p>
        <p><strong>Price:</strong> ${
          item.price ? '$' + Number(item.price).toFixed(2) : '-'
        }</p>
        <p><strong>Seat:</strong> ${item.seatInfo || '-'}</p>
        <p><strong>Status:</strong> ${
          item.concertDate
            ? new Date(item.concertDate) < new Date()
              ? 'Past'
              : 'Upcoming'
            : '-'
        }</p>

        <div class="calendar-inline">
          ${calendarWidget(item.concertDate)}
        </div>
      </div>

      <div class="top-row-right">
        ${imagesHtml}
      </div>
    </div>

    <section class="description" style="${item.notes ? '' : 'display:none;'}">
      <p>${item.notes || ''}</p>
    </section>

    <section class="songs-section" style="${songsArray.length ? '' : 'display:none;'}">
      <h4>Songs from this concert</h4>
      <ul class="songs-list"></ul>
    </section>

    <div class="item-actions">
      <button class="edit-btn">Edit</button>
      <button class="delete-btn">Delete</button>
    </div>
  `

  div.innerHTML = DOMPurify.sanitize(template)

  // ---- Inject songs with real audio elements ----
  if (songsArray.length) {
    const ul = div.querySelector('.songs-list')
    songsArray.forEach(song => {
      const li = document.createElement('li')
      li.className = 'song-item'

      const meta = document.createElement('div')
      meta.className = 'song-meta'
      meta.innerHTML = `
        <strong>${song.title || 'Unknown title'}</strong>
        <span class="song-artist"> – ${song.artist || 'Unknown artist'}</span>
      `
      li.appendChild(meta)

      if (song.preview) {
        const audio = document.createElement('audio')
        audio.controls = true
        audio.preload = 'auto'
        audio.src = song.preview.replace(/^http:\/\//, 'https://')
        li.appendChild(audio)
      } else {
        const noPrev = document.createElement('span')
        noPrev.className = 'no-preview'
        noPrev.innerHTML = '<i>No preview available</i>'
        li.appendChild(noPrev)
      }

      ul.appendChild(li)
    })
  }

  // edit/delete handlers
  div.querySelector('.edit-btn').addEventListener('click', () => editItem(item))
  div.querySelector('.delete-btn').addEventListener('click', () => deleteItem(item.id))

  return div
}

// ============================
// POPOVER FALLBACKS
// ============================
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

// ============================
// CREATE BUTTON
// ============================
if (createButton) {
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
}

// ============================
// FORM SUBMIT
// ============================
if (myForm) {
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

  // FORM RESET
  myForm.addEventListener('reset', () => {
    formHeading.textContent = 'Add a Concert Ticket'
    selectedSongs = []
    renderSelectedSongs()
    showStep1()
  })
}

// ============================
// SKIP SONGS (OPTIONAL)
// ============================
if (skipSongsBtn) {
  skipSongsBtn.addEventListener('click', () => {
    myForm.requestSubmit()
  })
}

// ============================
// STEP NAVIGATION
// ============================
if (goToSongsBtn) {
  goToSongsBtn.addEventListener('click', () => showStep2())
}

if (backToInfoBtn) {
  backToInfoBtn.addEventListener('click', () => showStep1())
}

// ============================
// SONG SEARCH EVENTS
// ============================
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

// ============================
// LOAD DATA FROM /data
// ============================
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
      if (createButton) createButton.style.display = 'none'
      if (contentArea) contentArea.style.display = 'none'
    }
  } catch (error) {
    console.error('Error fetching data:', error)
    notReadyStatus.style.display = 'block'
  }
}

// ============================
// INITIALIZE
// ============================
getData()
renderSelectedSongs()
showStep1()
