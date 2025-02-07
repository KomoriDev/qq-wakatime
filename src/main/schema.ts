export interface Categories {
  name: string;
  total_seconds: number;
  percent: number;
  digital: string;
  decimal: string;
  text: string;
  hours: number;
  minutes: number;
}

export interface Project {
  name: string;
  total_seconds: number;
  percent: number;
  digital: string;
  decimal: string;
  text: string;
  hours: number;
  minutes: number;
}

export interface Languages {
  name: string;
  total_seconds: number;
  percent: number;
  digital: string;
  decimal: string;
  text: string;
  hours: number;
  minutes: number;
  seconds?: number;
}

export interface Editors {
  name: string;
  total_seconds: number;
  percent: number;
  digital: string;
  decimal: string;
  text: string;
  hours: number;
  minutes: number;
  seconds?: number;
}

export interface OperatingSystems {
  name: string;
  total_seconds: number;
  percent: number;
  digital: string;
  decimal: string;
  text: string;
  hours: number;
  minutes: number;
}

export interface GrandTotal {
  digital: string;
  decimal: string;
  hours: number;
  minutes: number;
  text: string;
  total_seconds: number;
}

export interface StatusBar {
  grand_total: GrandTotal;
  categories?: Categories[];
  projects?: Project[];
  editors?: Editors[];
  languages?: Languages[];
  operating_systems?: OperatingSystems[];
}
