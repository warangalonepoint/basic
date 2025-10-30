import React from 'react'
import { createRoot } from 'react-dom/client'
import DoctorPWA from './DoctorPWA.jsx'
import './index.css' // or remove if you don’t have it

const root = createRoot(document.getElementById('root'))
root.render(<DoctorPWA />)
