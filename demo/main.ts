import './style.css'
import { isPasslockError, register, authenticate } from '../src/index'

/* Helpers */

const getElement = <T>(id: string) => document.getElementById(id) as T

const showMessage = (message: string) =>
  ((<HTMLDivElement>getElement('console')).innerHTML = message)

const showSpinner = (text: HTMLSpanElement, spinner: SVGElement) => {
  text.classList.replace('block', 'hidden')
  spinner.classList.replace('hidden', 'block')
}

const hideSpinner = (text: HTMLSpanElement, spinner: SVGElement) => {
  text.classList.replace('hidden', 'block')
  spinner.classList.replace('block', 'hidden')
}

const saveIds = () => {
  const tenancyId = (<HTMLInputElement>getElement('tenancyId')).value
  const clientId = (<HTMLInputElement>getElement('clientId')).value
  const endpoint = (<HTMLInputElement>getElement('endpoint')).value

  window.localStorage.setItem('passlock.demo.tenancyId', tenancyId)
  window.localStorage.setItem('passlock.demo.clientId', clientId)
  window.localStorage.setItem('passlock.demo.endpoint', endpoint)
}

const restoreIds = () => {
  const tenancyId = window.localStorage.getItem('passlock.demo.tenancyId')
  if (tenancyId) (<HTMLInputElement>getElement('tenancyId')).value = tenancyId

  const clientId = window.localStorage.getItem('passlock.demo.clientId')
  if (clientId) (<HTMLInputElement>getElement('clientId')).value = clientId

  const endpoint = window.localStorage.getItem('passlock.demo.endpoint')
  if (endpoint) (<HTMLInputElement>getElement('endpoint')).value = endpoint
}

/* Handlers */

const registerHandler = async () => {
  const btnText = getElement<HTMLSpanElement>('registerBtnText')
  const btnSpinner = getElement<SVGElement>('registerBtnSpinner')

  const tenancyId = (<HTMLInputElement>getElement('tenancyId')).value
  const clientId = (<HTMLInputElement>getElement('clientId')).value
  const endpoint = (<HTMLInputElement>getElement('endpoint')).value

  const firstName = (<HTMLInputElement>getElement('firstName')).value
  const lastName = (<HTMLInputElement>getElement('lastName')).value
  const email = (<HTMLInputElement>getElement('email')).value

  // add real validation
  if (!tenancyId || !clientId || !firstName || !lastName || !email) {
    showMessage('Please complete all fields')
    return
  }

  try {
    showSpinner(btnText, btnSpinner)
    showMessage('')

    const result = await register({
      tenancyId,
      clientId,
      endpoint,
      firstName,
      lastName,
      email,
    })

    if (isPasslockError(result)) {
      console.error(result)
      showMessage(result.message)
    } else {
      console.log(result)
      showMessage(`<pre>${JSON.stringify(result, undefined, 2)}</pre>`)
      saveIds()
    }
  } finally {
    hideSpinner(btnText, btnSpinner)
  }
}

const loginHandler = async () => {
  const btnText = getElement<HTMLSpanElement>('loginBtnText')
  const btnSpinner = getElement<SVGElement>('loginBtnSpinner')

  const tenancyId = (<HTMLInputElement>getElement('tenancyId')).value
  const clientId = (<HTMLInputElement>getElement('clientId')).value
  const endpoint = (<HTMLInputElement>getElement('endpoint')).value

  // add real validation
  if (!tenancyId || !clientId) {
    showMessage('Please complete all fields')
    return
  }

  try {
    showSpinner(btnText, btnSpinner)
    showMessage('')

    const result = await authenticate({
      tenancyId,
      clientId,
      endpoint,
      userVerification: false,
    })

    if (isPasslockError(result)) {
      console.error(result)
      showMessage(result.message)
    } else {
      console.log(result)
      showMessage(`<pre>${JSON.stringify(result, undefined, 2)}</pre>`)
      saveIds()
    }
  } finally {
    hideSpinner(btnText, btnSpinner)
  }
}

document
  .getElementById('registerBtn')
  ?.addEventListener('click', registerHandler)
document.getElementById('loginBtn')?.addEventListener('click', loginHandler)
restoreIds()
