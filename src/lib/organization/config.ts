import rawConfiguration from '../../../config/organization.json'
import { parseOrganizationConfig } from './schema'

export const organization = parseOrganizationConfig(rawConfiguration)
