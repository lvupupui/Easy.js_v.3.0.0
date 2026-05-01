{{- define "easyjs.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "easyjs.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name (include "easyjs.name" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "easyjs.labels" -}}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/name: {{ include "easyjs.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "easyjs.selectorLabels" -}}
app.kubernetes.io/name: {{ include "easyjs.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}
