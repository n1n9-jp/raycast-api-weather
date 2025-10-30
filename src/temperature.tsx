import { Detail, ActionPanel, Action, LocalStorage } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState, useEffect } from "react";

interface LocationResponse {
  success: boolean;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  timezone: {
    id: string;
  };
}

interface WeatherResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    temperature_2m: number[];
  };
  hourly_units: {
    time: string;
    temperature_2m: string;
  };
}

function WeatherDisplay({
  latitude,
  longitude,
  city,
  country,
  timezoneId,
}: {
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  timezoneId: string;
}) {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const now = new Date();
  const dateString = now.toLocaleDateString("en-CA", { timeZone: timezoneId, year: "numeric", month: "2-digit", day: "2-digit" });
  const timeString = now.toLocaleTimeString("en-GB", { timeZone: timezoneId, hour: "2-digit", minute: "2-digit", hour12: false });
  const startTime = `${dateString}T05:00`;
  const endTime = `${dateString}T${timeString}`;
  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&timezone=${timezoneId}&start_hour=${startTime}&end_hour=${endTime}`;

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          throw new Error(response.statusText);
        }
        const data: WeatherResponse = await response.json();
        setWeather(data);
        await LocalStorage.setItem("cachedWeatherData", JSON.stringify(data));
        setIsStale(false);
        setError(null);
      } catch (e) {
        setError(e as Error);
        const cachedData = await LocalStorage.getItem<string>("cachedWeatherData");
        if (cachedData) {
          setWeather(JSON.parse(cachedData));
          setIsStale(true);
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [apiUrl]);

  if (isLoading && !weather) {
    return <Detail isLoading={true} />;
  }

  if (error && !weather) {
    return (
      <Detail
        markdown={`# データ取得中にエラーが発生しました\n\n無料APIを使っているため、時々アクセスが混み合うことがあります。\n\n**またアクセスしてみてください！** 🔄\n\n---\n\n💡 **ヒント**\n- 数秒待ってから再実行してみてください\n- それでもダメな場合は、少し時間をおいてから試してみてください\n\n*無料APIのため、レート制限がかかることがあります*`}
      />
    );
  }

  if (!weather || !weather.hourly) {
    return <Detail isLoading={true} />;
  }

  const data = weather; // Use the state data

  const labels = data.hourly.time.map((time) => time.split("T")[1]);
  const formattedDate = now.toLocaleDateString("en-US", { timeZone: timezoneId, year: "numeric", month: "long", day: "numeric" });

  const minTemp = Math.min(...data.hourly.temperature_2m);
  const maxTemp = Math.max(...data.hourly.temperature_2m);
  const yAxisMin = minTemp < 0 ? Math.floor(minTemp) : 0;
  const yAxisMax = maxTemp > 40 ? Math.ceil(maxTemp) + 2 : 40;

  const chartConfig = {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: `気温 (${data.hourly_units.temperature_2m})`,
          data: data.hourly.temperature_2m,
          borderColor: "rgba(135, 206, 250, 1)", // 明るい青色
          backgroundColor: "rgba(135, 206, 250, 0.3)", // 透明度のある塗りつぶし
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      title: {
        display: true,
        text: `${city}, ${country} - ${formattedDate}`,
        fontSize: 20,
        fontColor: "#333",
        fontFamily: "Helvetica",
      },
      legend: {
        display: false, // 凡例を非表示
      },
      scales: {
        yAxes: [
          {
            scaleLabel: {
              display: false,
            },
            ticks: {
              suggestedMin: yAxisMin, // Y軸の最小値を動的に設定
              suggestedMax: yAxisMax, // Y軸の最大値を動的に設定
              fontStyle: "bold",
              fontFamily: "Helvetica",
            },
            gridLines: {
              color: "rgba(0, 0, 0, 0.05)",
            },
          },
        ],
        xAxes: [
          {
            scaleLabel: {
              display: false,
            },
            ticks: {
              fontStyle: "bold",
              fontFamily: "Helvetica",
            },
            gridLines: {
              display: false,
            },
          },
        ],
      },
      plugins: {
        // データラベルプラグインの設定
        datalabels: {
          display: true,
          anchor: "end",
          align: "top",
          formatter: (value: number) => `${value}°`,
          font: {
            weight: "bold",
            size: 14,
            family: "Helvetica",
          },
          color: "#555",
        },
      },
    },
  };

  const chartUrl = `https://quickchart.io/chart?w=800&h=400&bkg=white&c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

  const timeSeriesData = data.hourly.time
    .map((time, index) => {
      const temp = data.hourly.temperature_2m[index];
      return `| ${time} | ${temp}${data.hourly_units.temperature_2m} |`;
    })
    .join("\n");

  const staleMessage = isStale ? `\n\n> ⚠️ **更新に失敗しました。前回取得したデータを表示しています。**\n\n` : "";

  const markdown = `${staleMessage}# ${city}, ${country} の気温推移（今日）\n\n**期間**: ${startTime} 〜 ${endTime}\n**場所**: ${city}, ${country}\n**座標**: 緯度 ${data.latitude}, 経度 ${data.longitude}\n**タイムゾーン**: ${data.timezone}\n**データ数**: ${data.hourly.time.length}件\n\n## グラフ\n\n![気温推移グラフ](${chartUrl})\n\n## 時系列データ\n\n| 時刻 | 気温 |\n|------|------|\n${timeSeriesData}`;

  return (
    <Detail
      isLoading={isLoading && !weather}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="グラフを新しいタブで開く" url={chartUrl} />
          <Action.CopyToClipboard
            title="グラフURLをコピー"
            content={chartUrl}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  // IPベースで位置情報を取得
  const {
    data: locationData,
    isLoading: locationLoading,
    error: locationError,
  } = useFetch<LocationResponse>("https://ipwho.is/");

  // 位置情報の取得を待つ
  if (locationLoading) {
    return <Detail isLoading={true} markdown="位置情報を取得中..." />;
  }

  if (locationError || !locationData || !locationData.success) {
    return (
      <Detail
        markdown={`# 位置情報の取得中にエラーが発生しました\n\n無料APIを使っているため、時々アクセスが混み合うことがあります。\n\n**もう一度試してみてください！** 🔄\n\n---\n\n💡 **ヒント**\n- 数秒待ってから再実行してみてください\n- VPNを使用している場合、一時的にオフにしてみてください\n\n*IPベースの位置検出のため、VPN経由だと位置が正確でない場合があります*`}
      />
    );
  }

  // 位置情報が取得できたら、WeatherDisplayコンポーネントを表示
  return (
    <WeatherDisplay
      latitude={locationData.latitude}
      longitude={locationData.longitude}
      city={locationData.city}
      country={locationData.country}
      timezoneId={locationData.timezone.id}
    />
  );
}