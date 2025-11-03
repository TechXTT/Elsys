export interface NavItem {
  key: string;
  href?: string;
  children?: Array<{
    key: string;
    href: string;
  }>;
}

export const nav: NavItem[] = [
  { key: "news", href: "/novini" },
  {
    key: "admissions",
    children: [
      { key: "admissionsWhy", href: "/priem/zashto-da-izbera-tues" },
      { key: "admissionsProcess", href: "/priem/red-i-uslovija-za-priem" },
      { key: "admissionsNetworks", href: "/priem/specialnost-komputyrni-mreji" },
      { key: "admissionsAI", href: "/priem/specialnost-programirane-na-izkustven-intelekt" },
      { key: "admissionsSystems", href: "/priem/specialnost-sistemno-programirane" },
      { key: "admissionsFest", href: "/priem/tues-fest-den-na-otvorenite-vrati" },
    ],
  },
  {
    key: "education",
    children: [
      { key: "educationVocational", href: "/obuchenie/profesionalno-obrazovanie" },
      { key: "educationCurriculum", href: "/obuchenie/uchebna-programa" },
      { key: "educationPractice", href: "/obuchenie/uchebna-praktika-po-specialnostta" },
      { key: "educationApproach", href: "/obuchenie/inovativen-ucheben-podhod" },
      { key: "educationIntegration", href: "/obuchenie/integracija-s-tu-sofija" },
      { key: "educationThesis", href: "/obuchenie/diplomna-rabota" },
      { key: "educationCisco", href: "/obuchenie/cisco-akademija" },
      { key: "educationInvestech", href: "/obuchenie/investech-project" },
      { key: "educationCalendar", href: "/obuchenie/kalendar-na-sabitijata" },
    ],
  },
  {
    key: "school",
    children: [
      { key: "schoolMission", href: "/uchilishteto/misija" },
      { key: "schoolHistory", href: "/uchilishteto/istorija" },
      { key: "schoolNumbers", href: "/uchilishteto/tues-v-chisla" },
      { key: "schoolAlumni", href: "/uchilishteto/asociacija-na-zavurshilite-tues" },
      { key: "schoolLeaders", href: "/uchilishteto/lideri-zavurshili-tues" },
      { key: "schoolBoard", href: "/uchilishteto/obshtestven-savet" },
      { key: "schoolTeam", href: "/uchilishteto/prepodavatelski-ekip" },
      { key: "schoolPolicies", href: "/uchilishteto/pravilnici-i-dokumenti" },
      { key: "schoolGallery", href: "/uchilishteto/galerija" },
      { key: "schoolContacts", href: "/uchilishteto/kontakti" },
    ],
  },
  {
    key: "studentLife",
    children: [
      { key: "studentLifeClubs", href: "/uchenicheski-zhivot/klubove" },
      { key: "studentLifeHack", href: "/uchenicheski-zhivot/hack-tues" },
      { key: "studentLifeTalks", href: "/uchenicheski-zhivot/tues-talks" },
      { key: "studentLifeInspiration", href: "/uchenicheski-zhivot/inspiration-talks" },
      { key: "studentLifeTrips", href: "/uchenicheski-zhivot/ekskurzii" },
      { key: "studentLifeVoices", href: "/uchenicheski-zhivot/mnenija-za-tues" },
      { key: "studentLifeAwards", href: "/uchenicheski-zhivot/nagradi" },
    ],
  },
  { key: "blog", href: "/blog" },
  { key: "projects", href: "/evroproekti" },
];
