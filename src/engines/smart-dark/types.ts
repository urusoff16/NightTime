export interface ColorValue {
  /** Linearized only during color math; stored channels remain normalized sRGB. */
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface OklabColor {
  l: number;
  a: number;
  b: number;
}

export interface OklchColor {
  l: number;
  c: number;
  h: number;
  alpha: number;
}

export interface ContrastAdjustment {
  color: ColorValue;
  before: number;
  after: number;
  changed: boolean;
  reachable: boolean;
  alphaAdjusted: boolean;
}

export type PageThemeKind = 'light' | 'dark' | 'mixed';

export interface PageThemeReport {
  kind: PageThemeKind;
  darknessScore: number;
  coverage: { dark: number; medium: number; light: number };
  sampledElements: number;
  uniqueColors: number;
  colorClusters: { foreground: ColorCluster[]; background: ColorCluster[] };
  issues: ContrastIssue[];
}

export interface ColorCluster {
  color: ColorValue;
  sampleCount: number;
  /** Sum of text-element bounding-box areas; nested samples may overlap. */
  sampledArea: number;
  roles: Partial<Record<SemanticRole, number>>;
}

export interface ContrastIssue {
  role: SemanticRole;
  ratio: number;
  target: number;
}

export type SemanticRole =
  'text-primary' | 'text-secondary' | 'link' | 'button' | 'input' | 'icon' | 'unknown';

export type BackgroundImageType = 'none' | 'gradient' | 'image' | 'mixed';

/** DOM handles stay in the analyzer and are never copied into PageThemeReport or storage. */
export interface TextColorSample {
  element: HTMLElement;
  foreground: ColorValue;
  background: ColorValue;
  effectiveOpacity: number;
  fontSize: number;
  fontWeight: number;
  area: number;
  viewportPriority: boolean;
  role: SemanticRole;
  backgroundImageType: BackgroundImageType;
  confidence: 'solid' | 'translucent' | 'complex';
  largeText: boolean;
}
