import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const browser = await chromium.launch()

const page = await browser.newPage()

await page.goto('https://darksouls.fandom.com/es/wiki/Logros/Trofeos_de_Dark_Souls')

const trophies = await page.$$eval('tr', results =>
  results.map(el => {
    const logro = el.querySelector('b')?.innerText
    const images = el.querySelectorAll('a')
    const allTd = el.querySelectorAll('td')
    const descripcion = allTd[2]?.innerText
    const imagenLogro = images[0]?.getAttribute('href')

    return { logro, descripcion, imagenLogro }
  }),
)

async function downloadImage(trophie, i) {
  const { imagenLogro, logro } = trophie
  try {
    const response = await axios.get(imagenLogro, { responseType: 'stream' })

    const extension = '.png' // por si no tiene extensión clara
    const filename = `${i} - ${logro.replace(':', '')}${extension}`
    const writer = fs.createWriteStream(path.resolve(__dirname, 'imagenes', filename))

    await response.data.pipe(writer)

    return await new Promise((resolve, reject) => {
      writer.on('finish', () => {
        console.log(`✅ Imagen guardada como ${filename}`)
        resolve()
      })
      writer.on('error', reject)
    })
  } catch (error) {
    console.error(`❌ Error al descargar ${imagenLogro}:`, error.message)
  }
}

async function downloadAll() {
  // Crea carpeta si no existe
  const folder = path.resolve(__dirname, 'imagenes')
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder)
  }

  trophies.slice(1).map(async (trophie, i) => {
    await downloadImage(trophie, i)
  })
}

// Creamos el contenido en formato legible
const guararInfo = () => {
  const contenido = trophies
    .slice(1)
    .map(item => `Logro:\n${item.logro}\nDescripción:\n${item.descripcion}\n\n`)
    .join('')

  // Ruta del archivo
  const rutaArchivo = path.resolve('logros.txt')

  // Guardar el archivo
  try {
    console.log(`✅ Archivo guardado con Exito`)
    fs.writeFileSync(rutaArchivo, contenido, 'utf-8')
  } catch (error) {
    console.error(`❌ Error al guardar el archivo.`)
  }
}

await browser.close()

downloadAll()
guararInfo()
