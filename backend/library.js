const express = require('express')
const mongoose = require('mongoose')

const allowedPlatforms = ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Other']
const allowedStatuses = ['Not started', 'Playing', 'Completed']

const libraryEntrySchema = new mongoose.Schema(
{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    gameName: { type: String, required: true, trim: true },
    platform: { type: String, required: true, enum: allowedPlatforms },
    hours: { type: Number, default: 0, min: 0 },
    completionStatus: { type: String, default: 'Not started', enum: allowedStatuses },
    gameImage: { type: String, default: '' },
    source: { type: String, default: 'manual', enum: ['manual', 'steam'] },
},
{ timestamps: true }
)

libraryEntrySchema.index({ user: 1, gameName: 1, platform: 1 }, { unique: true })

const LibraryEntry = mongoose.model('LibraryEntry', libraryEntrySchema)

function createLibraryRouter(requireAuth)
{
    const router = express.Router()
    const parseLibraryJson = express.json({ limit: '16kb' })

    // GET /api/library
    router.get('/', requireAuth, async (req, res) =>
    {
        try
        {
            const entries = await LibraryEntry.find({ user: req.user._id }).sort({ createdAt: -1 })
            return res.json({ entries })
        }
        catch (error)
        {
            console.error('Fetch library failed:', error.name)
            return res.status(500).json({ error: 'Could not load your library.' })
        }
    })

    // POST /api/library
    router.post('/', requireAuth, parseLibraryJson, async (req, res) =>
    {
        const { gameName, platform, hours, completionStatus, gameImage } = req.body ?? {}

        const cleanName = typeof gameName === 'string' ? gameName.trim() : ''
        if (!cleanName || cleanName.length > 120)
            return res.status(400).json({ error: 'Game title is required (max 120 characters).' })
        

        if (!allowedPlatforms.includes(platform))
            return res.status(400).json({ error: 'Select a valid platform.' })
        

        const numericHours = hours === undefined || hours === '' ? 0 : Number(hours)
        if (!Number.isFinite(numericHours) || numericHours < 0)
            return res.status(400).json({ error: 'Hours played must be 0 or greater.' })
        

        const status = completionStatus || 'Not started'
        if (!allowedStatuses.includes(status))
            return res.status(400).json({ error: 'Invalid completion status.' })
        

        const cleanImage = typeof gameImage === 'string' ? gameImage.trim() : ''
        if (cleanImage && !/^https?:\/\/.+/i.test(cleanImage))
            return res.status(400).json({ error: 'Cover image must be a valid http or https URL.' })
        

        try
        {
            const entry = await LibraryEntry.create(
            {
                user: req.user._id,
                gameName: cleanName,
                platform,
                hours: numericHours,
                completionStatus: status,
                gameImage: cleanImage,
                source: 'manual',
            })

            return res.status(201).json({ entry })
        }
        catch (error)
        {
            if (error.code === 11000)
                return res.status(409).json({ error: 'This game is already in your library for that platform.' })

            console.error('Add game failed:', error.name, error.code ?? '')
            return res.status(500).json({ error: 'Could not save game. Please try again.' })
        }
    })

    return router
}

module.exports = { LibraryEntry, createLibraryRouter }