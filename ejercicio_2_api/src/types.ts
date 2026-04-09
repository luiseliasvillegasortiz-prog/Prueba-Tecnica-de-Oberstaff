export type Row = Record<string, string>;

export interface DataStore {
  intervenciones: Row[];
  horas: Row[];
  materiales: Row[];
  desplazamientos: Row[];
  horasByIncidencia: Map<string, Row[]>;
  materialesByIncidencia: Map<string, Row[]>;
  desplazamientosByIncidencia: Map<string, Row[]>;
  intervencionesByIncidencia: Map<string, Row>;
}

export interface ResumenKpis {
  total_intervenciones: number;
  total_cerradas: number;
  total_pendientes: number;
  coste_total: number;
  venta_total: number;
}
