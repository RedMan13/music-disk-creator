const fs = require('fs')
const inputFile = process.argv[2]
const outputDir = process.argv[3]
if (!inputFile || !fs.existsSync(inputFile)) throw 'Invalid input file directory'
if (!outputDir || !fs.existsSync(outputDir)) throw 'Invalid output file directory'

// a parser util for Variable Length Quantity values
const VLQParser = buffer => {
    if (((buffer[0] >> 7) & 0b1) === 0b0) return buffer[0]
    let number = 0
    for (let byteIndex = 0;  byteIndex < buffer.length; byteIndex++) {
        const byte = buffer[byteIndex]
        number = ((number << 1) + ((byte >> 6) & 0b1))
        number = ((number << 1) + ((byte >> 5) & 0b1))
        number = ((number << 1) + ((byte >> 4) & 0b1))
        number = ((number << 1) + ((byte >> 3) & 0b1))
        number = ((number << 1) + ((byte >> 2) & 0b1))
        number = ((number << 1) + ((byte >> 1) & 0b1))
        number = ((number << 1) + (byte & 0b1))
    }
    return number
}
const parseChunk = (offset, buffer) => {
    const chunkType = buffer.subarray(offset, offset + 4).toString('ascii')
    switch (chunkType) {
    case 'MThd':
        // length always 6 but we get it and use it anyways
        const length = (buffer[offset + 4] << 24) + (buffer[offset + 4 + 1] << 16) + (buffer[offset + 4 + 2] << 8) + buffer[offset + 4 + 3];
        const chunk = buffer.subarray(offset + 4, offset + 4 + length)

        const format = (chunk[0] << 8) + chunk[1]
        const ntrks = (chunk[2] << 8) + chunk[3]
        const division = (chunk[4] << 8) + chunk[5]
        const isMetric = Boolean(division >> 18)
        const outputObject = {
            chunkType,
            format,
            ntrks,
            isMetric,
            nextOffset: offset + length
        }
        if (isMetric) {
            const mainData = (division << 1) >> 1
            outputObject.fps = mainData >> 8
            outputObject.resolution = mainData & 0xf
        } else {
            // we shift off the last bit then use that for the ticks per quarter note
            outputObject.tpqn = (division << 1) >> 1
        }
        return outputObject
    default:
        // we return null to indicate that this chunk is un-parsable
        return null;
    }
}

// for now, we dont care what we are intaking, only that its valid
const midiFile = fs.readFileSync(inputFile)
let offset = 0
while (offset < midiFile.length) {
    const chunk = parseChunk(offset, midiFile)
    if (!chunk) {
        throw `unkown chunk at ${offset}`
    }
    console.log(chunk)
    offset = chunk.nextOffset
}