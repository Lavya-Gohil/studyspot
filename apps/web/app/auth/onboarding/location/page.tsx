import { listCountries } from '@/lib/geo-data'
import { LocationForm } from './LocationForm'

/**
 * Server component so `country-state-city` is resolved during rendering and
 * only the trimmed country list crosses to the browser: the full dataset used
 * to ship with this route, making it the heaviest page in the app at 282kB.
 */
export default function LocationPage() {
  return <LocationForm countries={listCountries()} />
}
