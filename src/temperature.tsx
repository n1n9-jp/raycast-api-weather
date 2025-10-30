import { Detail, ActionPanel, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";

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
  const now = new Date();

  // 取得したタイムゾーンで今日の0時を取得
  const dateString = now.toLocaleDateString("en-CA", {
    timeZone: timezoneId,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }); // YYYY-MM-DD

  // 取得したタイムゾーンで現在時刻を取得（HH:mm形式）
  const timeString = now.toLocaleTimeString("en-GB", {
    timeZone: timezoneId,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }); // HH:mm

  // 今日の5時
  const startTime = `${dateString}T05:00`;
  // 現在時刻
  const endTime = `${dateString}T${timeString}`;

  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&timezone=${timezoneId}&start_hour=${startTime}&end_hour=${endTime}`;

  const { data, isLoading, error } = useFetch<WeatherResponse>(apiUrl);

  if (error) {
    return (
      <Detail
        markdown={`# データ取得中にエラーが発生しました\n\n無料APIを使っているため、時々アクセスが混み合うことがあります。\n\n**またアクセスしてみてください！** 🔄\n\n---\n\n💡 **ヒント**\n- 数秒待ってから再実行してみてください\n- それでもダメな場合は、少し時間をおいてから試してみてください\n\n*無料APIのため、レート制限がかかることがあります*`}
      />
    );
  }

  if (!data || !data.hourly) {
    return <Detail isLoading={true} />;
  }

  // 時刻ラベルを整形（時刻部分のみ表示）
  // APIから返ってくる時刻は既に日本時間なので、そのまま抽出
  const labels = data.hourly.time.map((time) => {
    // ISO8601形式の文字列から時刻部分を抽出（例: "2025-10-30T15:00" -> "15:00"）
    return time.split("T")[1];
  });

  // 日付を整形（例: October 30, 2025）
  const formattedDate = now.toLocaleDateString("en-US", {
    timeZone: timezoneId,
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // QuickChart用のChart.js設定
  const chartConfig = {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: `気温 (${data.hourly_units.temperature_2m})`,
          data: data.hourly.temperature_2m,
          borderColor: "rgb(75, 192, 192)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      title: {
        display: true,
        text: `${city}, ${country} - ${formattedDate}`,
        fontSize: 18,
      },
      legend: {
        display: true,
        position: "top",
      },
      scales: {
        yAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: `気温 (${data.hourly_units.temperature_2m})`,
            },
            ticks: {
              beginAtZero: false,
            },
          },
        ],
        xAxes: [
          {
            scaleLabel: {
              display: true,
              labelString: "時刻",
            },
          },
        ],
      },
    },
  };

  // QuickChart URLを生成
  const chartUrl = `https://quickchart.io/chart?width=800&height=400&chart=${encodeURIComponent(
    JSON.stringify(chartConfig)
  )}`;

  // デバッグ: タイトルを確認
  console.log("Chart title:", `${city}, ${country} - ${formattedDate}`);

  // 時系列データをテーブル形式で表示
  const timeSeriesData = data.hourly.time
    .map((time, index) => {
      const temp = data.hourly.temperature_2m[index];
      return `| ${time} | ${temp}${data.hourly_units.temperature_2m} |`;
    })
    .join("\n");

  const markdown = `
# ${city}, ${country} の気温推移（今日）

**期間**: ${startTime} 〜 ${endTime}
**場所**: ${city}, ${country}
**座標**: 緯度 ${data.latitude}, 経度 ${data.longitude}
**タイムゾーン**: ${data.timezone}
**データ数**: ${data.hourly.time.length}件

## グラフ

![気温推移グラフ](${chartUrl})

## 時系列データ

| 時刻 | 気温 |
|------|------|
${timeSeriesData}
`;

  return (
    <Detail
      isLoading={isLoading}
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