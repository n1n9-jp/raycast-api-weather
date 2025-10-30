import { Detail } from "@raycast/api";
import { useFetch } from "@raycast/utils";

// 東京の座標をデフォルトで使用
const TOKYO_LATITUDE = 35.6762;
const TOKYO_LONGITUDE = 139.6503;

interface WeatherResponse {
  latitude: number;
  longitude: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  current_units: {
    temperature_2m: string;
    relative_humidity_2m: string;
    wind_speed_10m: string;
  };
}

export default function Command() {
  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${TOKYO_LATITUDE}&longitude=${TOKYO_LONGITUDE}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`;

  const { data, isLoading, error } = useFetch<WeatherResponse>(apiUrl, {
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
  });

  if (error) {
    return (
      <Detail
        markdown={`# エラー\n\nデータの取得に失敗しました\n\n**エラー内容**: ${error.message}\n\n**API URL**: ${apiUrl}\n\n**対処方法**:\n- インターネット接続を確認してください\n- しばらく待ってから再度お試しください`}
      />
    );
  }

  if (!data) {
    return <Detail isLoading={true} />;
  }

  const markdown = `
# 東京の現在の天気

## 基本情報
- **時刻**: ${data.current.time}
- **座標**: 緯度 ${data.latitude}, 経度 ${data.longitude}

## 気象データ
- **気温**: ${data.current.temperature_2m}${data.current_units.temperature_2m}
- **湿度**: ${data.current.relative_humidity_2m}${data.current_units.relative_humidity_2m}
- **風速**: ${data.current.wind_speed_10m}${data.current_units.wind_speed_10m}
- **天気コード**: ${data.current.weather_code}
`;

  return <Detail isLoading={isLoading} markdown={markdown} />;
}