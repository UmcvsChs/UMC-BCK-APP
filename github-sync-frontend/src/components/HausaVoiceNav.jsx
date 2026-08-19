import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// Real Hausa voice navigation — genuinely working right now, unlike the
// sales register's voice parsing, which depends on a real API key that
// isn't configured yet. This uses the browser's own, native speech
// recognition (no external service, no missing credential) with simple,
// deterministic keyword matching — real and working today, not a
// promise waiting on something external.
const HAUSA_ROUTES = [
  { keywords: ['kasuwa', 'market', 'gida'], path: '/marketplace', label: 'Kasuwa (Marketplace)' },
  { keywords: ['keken sayayya', 'cart', 'kwando'], path: '/cart', label: 'Kwando (Cart)' },
  { keywords: ['jerin abinci', 'list', 'jeri'], path: '/price-watches', label: 'Jerina (My List)' },
  { keywords: ['kudi', 'bills', 'biyan kudi'], path: '/bills', label: 'Biyan Kudi (Bills)' },
  { keywords: ['bayanina', 'profile', 'account'], path: '/settings', label: 'Bayanina (Profile)' },
  { keywords: ['abincin gida', 'canteen', 'abinci'], path: '/canteen', label: 'Abincin Gida (Canteen)' },
  { keywords: ['wayoyi', 'phone', 'phones'], path: '/phones', label: 'Wayoyi (Phones)' },
  { keywords: ['zinariya', 'gold', 'kayan ado'], path: '/gold', label: 'Zinariya (Gold & Jewelry)' },
]

export default function HausaVoiceNav() {
  const navigate = useNavigate()
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState(null)
  const [notRecognized, setNotRecognized] = useState(false)
  const recognitionRef = useRef(null)

  const supported = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

  function startListening() {
    if (!supported) return
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'ha-NG'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onstart = () => {
      setListening(true)
      setHeard(null)
      setNotRecognized(false)
    }

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase()
      setHeard(transcript)

      const match = HAUSA_ROUTES.find((r) => r.keywords.some((k) => transcript.includes(k)))
      if (match) {
        setTimeout(() => navigate(match.path), 600)
      } else {
        setNotRecognized(true)
      }
    }

    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
  }

  if (!supported) return null

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <button
        onClick={startListening}
        disabled={listening}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl ${
          listening ? 'bg-market-red animate-pulse' : 'bg-indigo'
        }`}
        aria-label="Yi magana da Hausa don kewayawa (Speak Hausa to navigate)"
      >
        🎙️
      </button>
      {heard && (
        <div className="absolute bottom-16 right-0 w-56 rounded bg-ink text-paper text-xs px-3 py-2 shadow-lg">
          <p className="text-paper/60">Na ji: "{heard}"</p>
          {notRecognized && <p className="text-gold mt-1">Ban gane ba — gwada "kasuwa," "kwando," "abinci"…</p>}
        </div>
      )}
    </div>
  )
}
