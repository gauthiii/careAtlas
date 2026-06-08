// Synthetic patient generator for the registration form's "auto-fill" button.
//
// Design goals:
//  - Coherent records: gender drives the first name, the name drives the
//    username/email, and the city carries a matching state + ZIP prefix.
//  - Strong randomness: draws come from crypto.getRandomValues (a CSPRNG),
//    not Math.random, so successive fills are uniformly distributed.
//  - Low collision: with FIRST_NAMES x LAST_NAMES distinct full-name pairs we
//    keep the chance of two generated patients sharing a name below 1 / 100,000.
//    See NAME_COMBINATIONS below. The email/username also get a random numeric
//    discriminator, so a full-record repeat is far rarer still.

const FEMALE_FIRST_NAMES = [
  'Olivia', 'Emma', 'Sophia', 'Ava', 'Isabella', 'Mia', 'Amelia', 'Harper', 'Evelyn', 'Abigail',
  'Emily', 'Ella', 'Scarlett', 'Grace', 'Chloe', 'Victoria', 'Riley', 'Aria', 'Lily', 'Aurora',
  'Zoey', 'Penelope', 'Layla', 'Nora', 'Hazel', 'Eleanor', 'Stella', 'Lucy', 'Paisley', 'Naomi',
  'Maya', 'Elena', 'Caroline', 'Genesis', 'Kennedy', 'Sadie', 'Hannah', 'Aaliyah', 'Allison', 'Gabriella',
  'Anna', 'Sarah', 'Ariana', 'Claire', 'Audrey', 'Bella', 'Nevaeh', 'Skylar', 'Lucia', 'Samantha',
  'Fatima', 'Aisha', 'Priya', 'Ananya', 'Mei', 'Yuki', 'Sofia', 'Camila', 'Valentina', 'Isabela',
  'Ingrid', 'Freya', 'Astrid', 'Saoirse', 'Niamh', 'Leila', 'Noor', 'Zara', 'Amara', 'Imani',
  'Keisha', 'Taylor', 'Morgan', 'Jordan', 'Reese', 'Quinn', 'Rowan', 'Sage', 'Wren', 'Iris',
  'Daisy', 'Ruby', 'Pearl', 'Esme', 'Margot', 'Beatrice', 'Florence', 'Matilda', 'Clara', 'Rosa',
  'Delphine', 'Camille', 'Manon', 'Chiara', 'Giulia', 'Bianca', 'Carmen', 'Sienna', 'Paloma', 'Itzel',
  'Mariana', 'Daniela', 'Renata', 'Catalina', 'Anaya', 'Diya', 'Saanvi', 'Isha', 'Tara', 'Meera',
  'Hina', 'Sana', 'Layan', 'Maryam', 'Yara', 'Lina', 'Rania', 'Salma', 'Dalia', 'Hana',
  'Mina', 'Saki', 'Aiko', 'Yua', 'Lan', 'Linh', 'Thuy', 'Hoa', 'Sumi', 'Jia',
  'Nadia', 'Vera', 'Katya', 'Lena', 'Anya', 'Mila', 'Sasha', 'Dasha', 'Polina', 'Galina',
  'Greta', 'Heidi', 'Ulla', 'Saga', 'Liv', 'Sigrid', 'Maren', 'Tove', 'Annika', 'Elsa',
  'Noa', 'Tamar', 'Shira', 'Dina', 'Talia', 'Roni', 'Maja', 'Zofia', 'Hanna', 'Ewa',
]

const MALE_FIRST_NAMES = [
  'Liam', 'Noah', 'Oliver', 'James', 'Elijah', 'William', 'Henry', 'Lucas', 'Benjamin', 'Theodore',
  'Mateo', 'Levi', 'Sebastian', 'Daniel', 'Jack', 'Michael', 'Alexander', 'Owen', 'Asher', 'Samuel',
  'Ethan', 'Leo', 'Jackson', 'Mason', 'Ezra', 'John', 'Hudson', 'Luca', 'Aiden', 'Joseph',
  'David', 'Jacob', 'Logan', 'Luke', 'Julian', 'Gabriel', 'Grayson', 'Wyatt', 'Matthew', 'Maverick',
  'Dylan', 'Isaac', 'Elias', 'Anthony', 'Thomas', 'Caleb', 'Nathan', 'Ryan', 'Adrian', 'Christopher',
  'Mohammed', 'Omar', 'Yusuf', 'Ali', 'Ibrahim', 'Hassan', 'Khalid', 'Tariq', 'Bilal', 'Zaid',
  'Arjun', 'Rohan', 'Aarav', 'Vivaan', 'Kiran', 'Dev', 'Aryan', 'Ishaan', 'Reyansh', 'Kabir',
  'Wei', 'Chen', 'Hao', 'Jin', 'Feng', 'Kai', 'Ren', 'Haru', 'Sora', 'Yuto',
  'Mateus', 'Thiago', 'Mauricio', 'Diego', 'Santiago', 'Emiliano', 'Bruno', 'Rafael', 'Andres', 'Felipe',
  'Lars', 'Bjorn', 'Magnus', 'Henrik', 'Erik', 'Sven', 'Anders', 'Mads', 'Finn', 'Soren',
  'Sean', 'Cian', 'Eoin', 'Declan', 'Fionn', 'Padraig', 'Conor', 'Niall', 'Oisin', 'Cormac',
  'Marco', 'Luigi', 'Giovanni', 'Matteo', 'Lorenzo', 'Alessandro', 'Francesco', 'Antonio', 'Giuseppe', 'Salvatore',
  'Dmitri', 'Ivan', 'Sergei', 'Nikolai', 'Pavel', 'Andrei', 'Mikhail', 'Alexei', 'Boris', 'Viktor',
  'Andre', 'Marcus', 'Darius', 'Malik', 'Xavier', 'Isaiah', 'Terrell', 'Amari', 'Jamal', 'Kwame',
  'Hugo', 'Felix', 'Oscar', 'Emil', 'Anton', 'Stefan', 'Jonas', 'Paul', 'Lennard', 'Moritz',
  'Adam', 'Jakub', 'Filip', 'Tomas', 'Lukas', 'Marek', 'Piotr', 'Wojciech', 'Bartosz', 'Krystian',
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
  'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper',
  'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson',
  'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',
  'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez',
  'Powell', 'Jenkins', 'Perry', 'Russell', 'Sullivan', 'Bell', 'Coleman', 'Butler', 'Henderson', 'Barnes',
  'Gonzales', 'Fisher', 'Vasquez', 'Simmons', 'Romero', 'Jordan', 'Patterson', 'Alexander', 'Hamilton', 'Graham',
  'Reynolds', 'Griffin', 'Wallace', 'Moreno', 'West', 'Cole', 'Hayes', 'Bryant', 'Herrera', 'Gibson',
  'Ellis', 'Tran', 'Medina', 'Aguilar', 'Stevens', 'Murray', 'Ford', 'Castro', 'Marshall', 'Owens',
  'Harrison', 'Fernandez', 'Mcdonald', 'Woods', 'Washington', 'Kennedy', 'Wells', 'Vargas', 'Henry', 'Chen',
  'Freeman', 'Webb', 'Tucker', 'Guzman', 'Burns', 'Crawford', 'Olson', 'Simpson', 'Porter', 'Hunter',
  'Gordon', 'Mendez', 'Silva', 'Shaw', 'Snyder', 'Mason', 'Dixon', 'Munoz', 'Hunt', 'Hicks',
  'Holmes', 'Palmer', 'Wagner', 'Black', 'Robertson', 'Boyd', 'Rose', 'Stone', 'Salazar', 'Fox',
  'Warren', 'Mills', 'Meyer', 'Rice', 'Schmidt', 'Garza', 'Daniels', 'Ferguson', 'Nichols', 'Stephens',
  'Soto', 'Weaver', 'Ryan', 'Gardner', 'Payne', 'Grant', 'Dunn', 'Kelley', 'Spencer', 'Hawkins',
  'Arnold', 'Pierce', 'Vazquez', 'Hansen', 'Peters', 'Santos', 'Hart', 'Bradley', 'Knight', 'Elliott',
  'Cunningham', 'Duncan', 'Armstrong', 'Hudson', 'Carroll', 'Lane', 'Riley', 'Andrews', 'Alvarado', 'Ray',
  'Delgado', 'Berry', 'Perkins', 'Hoffman', 'Johnston', 'Matthews', 'Pena', 'Richards', 'Contreras', 'Willis',
  'Carpenter', 'Lawrence', 'Sandoval', 'Guerrero', 'George', 'Chapman', 'Rios', 'Estrada', 'Ortega', 'Watkins',
  'Greene', 'Nunez', 'Wheeler', 'Valdez', 'Harper', 'Burke', 'Larson', 'Santiago', 'Maldonado', 'Morrison',
  'Franklin', 'Carlson', 'Austin', 'Dominguez', 'Carr', 'Lawson', 'Jacobs', 'Obrien', 'Lynch', 'Singh',
  'Vega', 'Bishop', 'Montgomery', 'Oliver', 'Jensen', 'Harvey', 'Williamson', 'Gilbert', 'Dean', 'Sims',
  'Espinoza', 'Howell', 'Li', 'Wong', 'Reid', 'Hanson', 'Le', 'Mccoy', 'Garrett', 'Burton',
  'Fuller', 'Wang', 'Weber', 'Welch', 'Rojas', 'Lucas', 'Marquez', 'Fields', 'Park', 'Yang',
  'Little', 'Banks', 'Padilla', 'Day', 'Walsh', 'Bowman', 'Schultz', 'Luna', 'Fowler', 'Mejia',
  'Davidson', 'Acosta', 'Brewer', 'May', 'Holland', 'Juarez', 'Newman', 'Pearson', 'Curtis', 'Cortez',
  'Douglas', 'Schneider', 'Joseph', 'Barrett', 'Navarro', 'Figueroa', 'Keller', 'Avila', 'Wade', 'Molina',
]

const STREET_NAMES = [
  'Maple', 'Oak', 'Cedar', 'Pine', 'Elm', 'Willow', 'Birch', 'Spruce', 'Aspen', 'Magnolia',
  'Sunset', 'Sunrise', 'Lakeview', 'Hillcrest', 'Meadow', 'Brookside', 'Riverside', 'Highland', 'Parkway', 'Forest',
  'Washington', 'Lincoln', 'Jefferson', 'Madison', 'Franklin', 'Adams', 'Jackson', 'Monroe', 'Wilson', 'Garfield',
  'Careway', 'Heritage', 'Liberty', 'Independence', 'Commerce', 'Market', 'Church', 'School', 'Mill', 'Bridge',
]

const STREET_SUFFIXES = ['Street', 'Avenue', 'Drive', 'Lane', 'Road', 'Boulevard', 'Court', 'Way', 'Place', 'Terrace']

const UNIT_PREFIXES = ['Apt', 'Suite', 'Unit', '#']

// City + matching state + ZIP prefix, so the address is internally consistent.
const CITIES = [
  { city: 'Phoenix', state: 'AZ', zip: '850' },
  { city: 'Tucson', state: 'AZ', zip: '857' },
  { city: 'Los Angeles', state: 'CA', zip: '900' },
  { city: 'San Diego', state: 'CA', zip: '921' },
  { city: 'San Francisco', state: 'CA', zip: '941' },
  { city: 'Sacramento', state: 'CA', zip: '958' },
  { city: 'Denver', state: 'CO', zip: '802' },
  { city: 'Miami', state: 'FL', zip: '331' },
  { city: 'Orlando', state: 'FL', zip: '328' },
  { city: 'Tampa', state: 'FL', zip: '336' },
  { city: 'Atlanta', state: 'GA', zip: '303' },
  { city: 'Chicago', state: 'IL', zip: '606' },
  { city: 'Indianapolis', state: 'IN', zip: '462' },
  { city: 'Boston', state: 'MA', zip: '021' },
  { city: 'Baltimore', state: 'MD', zip: '212' },
  { city: 'Detroit', state: 'MI', zip: '482' },
  { city: 'Minneapolis', state: 'MN', zip: '554' },
  { city: 'Kansas City', state: 'MO', zip: '641' },
  { city: 'Charlotte', state: 'NC', zip: '282' },
  { city: 'Newark', state: 'NJ', zip: '071' },
  { city: 'Las Vegas', state: 'NV', zip: '891' },
  { city: 'New York', state: 'NY', zip: '100' },
  { city: 'Buffalo', state: 'NY', zip: '142' },
  { city: 'Columbus', state: 'OH', zip: '432' },
  { city: 'Portland', state: 'OR', zip: '972' },
  { city: 'Philadelphia', state: 'PA', zip: '191' },
  { city: 'Pittsburgh', state: 'PA', zip: '152' },
  { city: 'Nashville', state: 'TN', zip: '372' },
  { city: 'Austin', state: 'TX', zip: '787' },
  { city: 'Dallas', state: 'TX', zip: '752' },
  { city: 'Houston', state: 'TX', zip: '770' },
  { city: 'San Antonio', state: 'TX', zip: '782' },
  { city: 'Salt Lake City', state: 'UT', zip: '841' },
  { city: 'Seattle', state: 'WA', zip: '981' },
  { city: 'Milwaukee', state: 'WI', zip: '532' },
]

const EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'proton.me', 'hotmail.com']

const EMERGENCY_RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Partner', 'Child', 'Friend', 'Guardian', 'Relative']

// Distinct full-name combinations. Surfaced so the collision guarantee is checkable.
export const NAME_COMBINATIONS = (FEMALE_FIRST_NAMES.length + MALE_FIRST_NAMES.length) * LAST_NAMES.length

// --- CSPRNG helpers ---------------------------------------------------------

// Unbiased integer in [0, max) using rejection sampling over the 32-bit space.
function randInt(max: number): number {
  if (max <= 0) return 0
  const limit = Math.floor(0xffffffff / max) * max
  const buf = new Uint32Array(1)
  let value = 0
  do {
    crypto.getRandomValues(buf)
    value = buf[0]
  } while (value >= limit)
  return value % max
}

function pick<T>(items: readonly T[]): T {
  return items[randInt(items.length)]
}

function pickOption(options: readonly string[] | undefined): string {
  return options && options.length ? pick(options) : ''
}

function digits(count: number): string {
  let out = ''
  for (let i = 0; i < count; i += 1) out += String(randInt(10))
  return out
}

// --- Field builders ---------------------------------------------------------

function makePhone(): string {
  // Area code avoids a leading 0/1; exchange likewise. Mirrors NANP formatting.
  const area = `${randInt(8) + 2}${digits(2)}`
  const exchange = `${randInt(8) + 2}${digits(2)}`
  return `(${area}) ${exchange}-${digits(4)}`
}

function makeDob(): string {
  // Adults between 18 and 90 years old, as a YYYY-MM-DD value for the date input.
  const now = new Date()
  const age = randInt(73) + 18
  const year = now.getFullYear() - age
  const month = randInt(12) + 1
  const day = randInt(28) + 1 // 1-28 keeps every month valid
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function makePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const nums = '23456789'
  const syms = '!@#$%^&*?'
  const all = upper + lower + nums + syms
  // Guarantee one of each required class, then fill to 14 and shuffle.
  const chars = [pick([...upper]), pick([...lower]), pick([...nums]), pick([...syms])]
  while (chars.length < 14) chars.push(pick([...all]))
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

export type GeneratedPatient = {
  firstName: string
  lastName: string
  dob: string
  gender: string
  ethnicity: string
  language: string
  phone: string
  email: string
  street1: string
  street2: string
  city: string
  zip: string
  condition: string
  accessibility: string
  insuranceId: string
  emergencyName: string
  emergencyPhone: string
  emergencyRelationship: string
  username: string
  password: string
}

// Generate one coherent patient. `selectOptions` lets the caller pass the exact
// dropdown choices from the form so generated select values always stay valid.
export function generatePatient(selectOptions: Record<string, string[]> = {}): GeneratedPatient {
  const isFemale = randInt(2) === 0
  const firstName = pick(isFemale ? FEMALE_FIRST_NAMES : MALE_FIRST_NAMES)
  const lastName = pick(LAST_NAMES)
  const place = pick(CITIES)

  const password = makePassword()
  const tag = digits(randInt(2) + 3) // 3-4 digit discriminator for handle uniqueness
  const handle = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, '')

  const emergencyFirst = pick(isFemale ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES)
  // Emergency contact usually shares the patient's surname, occasionally not.
  const emergencyLast = randInt(4) === 0 ? pick(LAST_NAMES) : lastName

  return {
    firstName,
    lastName,
    dob: makeDob(),
    gender: pickOption(selectOptions['Gender']) || (isFemale ? 'Female' : 'Male'),
    ethnicity: pickOption(selectOptions['Ethnicity']),
    language: pickOption(selectOptions['Primary language']),
    phone: makePhone(),
    email: `${handle}${tag}@${pick(EMAIL_DOMAINS)}`,
    street1: `${randInt(9899) + 100} ${pick(STREET_NAMES)} ${pick(STREET_SUFFIXES)}`,
    street2: randInt(2) === 0 ? `${pick(UNIT_PREFIXES)} ${randInt(40) + 1}` : '',
    city: place.city,
    zip: `${place.zip}${digits(2)}`,
    condition: pickOption(selectOptions['Primary health condition category']),
    accessibility: pickOption(selectOptions['Do you have any mobility or accessibility requirements?']),
    insuranceId: `${String.fromCharCode(65 + randInt(26))}${String.fromCharCode(65 + randInt(26))}${digits(9)}`,
    emergencyName: `${emergencyFirst} ${emergencyLast}`,
    emergencyPhone: makePhone(),
    emergencyRelationship: pick(EMERGENCY_RELATIONSHIPS),
    username: `${handle}${tag}`,
    password,
  }
}
