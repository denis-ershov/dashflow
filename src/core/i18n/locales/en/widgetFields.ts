import type { LocaleShape } from '../../types';
import type { widgetFields as ruWidgetFields } from '../ru/widgetFields';

export const widgetFields: LocaleShape<typeof ruWidgetFields> = {
  widgetFields: {
    bookmarks: {
      mode: {
        label: 'Display mode',
        help: 'Browser bookmark folder, a single large site tile, or multiple tabs',
        options: {
          folder: 'Bookmark folder',
          single: 'Single site',
          'folder-tabs': 'Sites + Tabs',
        },
      },
      singleTitle: {
        label: 'Site name',
        placeholder: 'For example, GitHub',
      },
      singleUrl: {
        label: 'Site address',
        help: 'Only http:// and https:// links are supported',
      },
      singleIconUrl: {
        label: 'Custom icon (optional)',
        help: 'If empty, the site favicon is used',
      },
      tileShape: {
        label: 'Bookmark shape',
        help: 'Tile silhouette: cards, square speed dial, posters or round icons',
        options: {
          'rectangle-horizontal': 'Card',
          square: 'Square',
          'rectangle-vertical': 'Poster',
          circle: 'Circle',
        },
      },
      cardStyle: {
        label: 'Card background style',
        help: 'Background material: glass, solid, outline or glow',
        options: {
          glass: 'Glass',
          solid: 'Solid',
          outline: 'Outline',
          transparent: 'Transparent',
          glow: 'Neon glow',
        },
      },
      borderRadius: {
        label: 'Corner rounding',
        help: 'Corner radius of the tiles',
        options: {
          none: 'Square corners (0px)',
          sm: 'Light (8px)',
          md: 'Medium (14px)',
          lg: 'Large (20px)',
          full: 'Full (pill/circle)',
        },
      },
      tileSize: {
        label: 'Tile size',
        help: 'Bookmark tile scale',
        options: {
          xs: 'Mini (XS)',
          compact: 'Compact (S)',
          medium: 'Standard (M)',
          large: 'Large (L)',
          xl: 'Maximum (XL)',
        },
      },
      columns: {
        label: 'Grid columns',
        help: 'Number of columns, or adapt to the container automatically',
        options: {
          '1': '1 column',
          '2': '2 columns',
          '3': '3 columns',
          '4': '4 columns',
          '5': '5 columns',
          '6': '6 columns',
          auto: 'Automatic',
        },
      },
      showSearch: {
        label: 'Live search bar',
        help: 'Quickly filter bookmarks by name and URL',
      },
      showTitle: {
        label: 'Show site name',
        help: 'Bookmark title text',
      },
      showUrl: {
        label: 'Show URL / domain',
        help: 'Domain name under the title',
      },
      showIcon: {
        label: 'Show favicon',
        help: 'High-resolution site logo',
      },
      structureMode: {
        label: 'Subfolders',
        help: 'Browse into folders or show one flat list of all links',
        options: {
          tree: 'Hierarchy (folder tree)',
          flatten: 'Single flat list (no folders)',
        },
      },
      folderSource: {
        label: 'Bookmark source',
        help: 'Browser bookmarks or your own DashFlow list',
        options: {
          chrome: 'Browser',
          custom: 'Custom',
        },
      },
      openInNewTab: {
        label: 'Open in a new tab',
        help: 'Open sites in a new browser tab',
      },
    },
    clock: {
      clockStyle: {
        label: 'Clock face style',
        help: 'Visual style of the font and digits',
        options: {
          digital: 'Digital',
          flip: 'Flip',
          serif: 'Serif',
          mono: 'Mono',
          minimal: 'Minimal',
        },
      },
      glowEffect: {
        label: 'Neon glow',
        help: 'Soft halo around the digits',
      },
      is24Hour: {
        label: '24-hour time',
        help: 'Show time in 24h or 12h (AM/PM) format',
      },
      showSeconds: {
        label: 'Show seconds',
        help: 'Running seconds next to the minutes',
      },
      blinkColon: {
        label: 'Blinking colon',
        help: 'The separator blinks every second',
      },
      showDate: {
        label: 'Show date and weekday',
        help: "Today's date under the clock",
      },
      dateFormat: {
        label: 'Date format',
        help: 'How detailed the day and month are',
        options: {
          full: 'Full (Monday, September 3)',
          short: 'Short (Mon, Sep 3)',
          numeric: 'Numeric (09/03)',
        },
      },
      timezone: {
        label: 'Time zone',
        help: 'Time zone for the clock (handy for remote work)',
        options: {
          local: "This device's local time",
          UTC: 'UTC (Coordinated Universal Time)',
          'Europe/London': 'London (GMT/BST)',
          'Europe/Berlin': 'Berlin / Paris (CET)',
          'Europe/Moscow': 'Moscow / Istanbul (MSK)',
          'Asia/Dubai': 'Dubai (GST)',
          'America/New_York': 'New York (EST/EDT)',
          'America/Los_Angeles': 'San Francisco (PST/PDT)',
          'Asia/Tokyo': 'Tokyo (JST)',
        },
      },
      showGreeting: {
        label: 'Personal greeting',
        help: 'Time-of-day greeting above the clock',
      },
      userName: {
        label: 'Your name',
        help: 'Name shown in the greeting',
      },
    },
    greeting: {
      userName: {
        label: 'Your name',
        help: 'Name used in the personal greeting',
      },
      customGreeting: {
        label: 'Custom greeting',
        help: 'Replace the standard time-of-day greeting',
        placeholder: 'For example: Welcome back, Creator!',
      },
      motivationalStatus: {
        label: 'Motivational status',
        help: 'An inspiring motto under the name',
        placeholder: 'Ready to climb mountains',
      },
      fontSize: {
        label: 'Heading size',
        help: 'Greeting font scale',
        options: {
          sm: 'S',
          md: 'M',
          lg: 'L',
          xl: 'XL',
        },
      },
      align: {
        label: 'Alignment',
        help: 'Text position in the widget card',
        options: {
          left: 'Left',
          center: 'Center',
          right: 'Right',
        },
      },
      glowEffect: {
        label: 'Text glow',
        help: 'Soft neon halo around the greeting',
      },
      showIcon: {
        label: 'Time-of-day emoji',
        help: 'Show an icon (sun, sunrise, moon) next to the words',
      },
    },
    iframe: {
      url: {
        label: 'Page URL',
        help: 'Web page to embed (the site must allow iframes via X-Frame-Options)',
      },
      title: {
        label: 'Frame title',
        help: 'Custom title in the frame header',
        placeholder: 'Analytics dashboard / Player',
      },
      showToolbar: {
        label: 'Toolbar (URL, Reload, Open)',
        help: 'A thin top bar with reload and open buttons',
      },
      zoom: {
        label: 'Page zoom (%)',
        help: 'CSS scaling of the embedded content',
      },
      allowScroll: {
        label: 'Allow frame scrolling',
        help: 'Show scrollbars when content overflows',
      },
    },
    notes: {
      defaultMode: {
        label: 'Default mode',
        help: 'Mode when a note opens: text editor or rendered Markdown',
        options: {
          edit: 'Editor',
          preview: 'Markdown',
        },
      },
      fontFamily: {
        label: 'Typeface',
        help: 'Font style: sans-serif, monospace for code, or elegant serif',
        options: {
          sans: 'Sans',
          mono: 'Code (Mono)',
          serif: 'Serif',
        },
      },
      fontSize: {
        label: 'Font size',
        help: 'Note text size',
      },
      lineWrapping: {
        label: 'Wrap long lines',
        help: 'Wrap long lines or scroll horizontally (handy for code)',
      },
      showWordCount: {
        label: 'Word and character count',
        help: 'Text length indicator at the bottom of the widget',
      },
      showSaveStatus: {
        label: 'Autosave indicator',
        help: 'Live sync status with local storage',
      },
    },
    pomodoro: {
      timerStyle: {
        label: 'Visual style',
        help: 'Glowing progress ring or large minimal digits',
        options: {
          ring: 'Ring',
          digital: 'Digits',
        },
      },
      workTime: {
        label: 'Focus time',
        help: 'Length of a deep work interval',
      },
      breakTime: {
        label: 'Short break',
        help: 'Rest between focus sessions',
      },
      longBreakTime: {
        label: 'Long break',
        help: 'A longer rest after a cycle of 4 sessions',
      },
      autoStartBreaks: {
        label: 'Start breaks automatically',
        help: 'Start the break countdown when a work sprint ends',
      },
      soundEnabled: {
        label: 'Sound alert',
        help: 'A soft Web Audio chime when the phase changes',
      },
    },
    quickLinks: {
      shape: {
        label: 'Icon shape',
        help: 'Geometric style of the link icons',
        options: {
          squircle: 'Squircle',
          circle: 'Circle',
          square: 'Square',
        },
      },
      columns: {
        label: 'Grid columns',
        help: 'How densely links are laid out',
        options: {
          '2': '2',
          '3': '3',
          '4': '4',
          '6': '6',
        },
      },
      showTitles: {
        label: 'Show site names',
        help: 'Text labels under the link icons',
      },
      showDomain: {
        label: 'Show domain (URL)',
        help: 'Short site address under the title',
      },
      openInNewTab: {
        label: 'Open in a new tab',
        help: 'Follow links in a new browser tab',
      },
    },
    quotes: {
      category: {
        label: 'Quote category',
        help: 'A themed collection of inspiring quotes',
        options: {
          all: 'All categories',
          code: 'Technology and software',
          wisdom: 'Wisdom and philosophy',
          motivation: 'Motivation and productivity',
          life: 'Life and creativity',
        },
      },
      fontStyle: {
        label: 'Typography',
        help: 'Classic book serif or modern sans-serif',
        options: {
          serif: 'Elegant serif',
          sans: 'Modern sans',
          mono: 'Terminal mono',
        },
      },
      textAlign: {
        label: 'Text alignment',
        help: 'Quote position on the widget card',
        options: {
          center: 'Center',
          left: 'Left',
        },
      },
      showAuthor: {
        label: 'Show author',
        help: 'Author name under the quote',
      },
      showCopyButton: {
        label: 'Copy button',
        help: 'Icon to copy the quote to the clipboard',
      },
      autoRefreshInterval: {
        label: 'Change quote automatically',
        help: 'How often the quote changes (0 = manually only)',
        options: {
          '0': 'Manually only (on click)',
          '1': 'Every hour',
          '4': 'Every 4 hours',
          '24': 'Every 24 hours (daily)',
        },
      },
    },
    rssReader: {
      readingMode: {
        label: 'Reading mode',
        help: 'One unified feed, or filter by tabs and folders',
        options: {
          unified: 'Unified feed',
          'feed-tabs': 'Tabs',
          folders: 'Categories',
        },
      },
      viewMode: {
        label: 'News layout',
        help: 'List format: thumbnails, compact rows or large cards',
        options: {
          thumbnails: 'With thumbnails (image on the left)',
          compact: 'Compact list',
          cards: 'Large cards with description',
          grid: 'Responsive grid (2 columns)',
          magazine: 'Magazine (top story + list)',
        },
      },
      cardStyle: {
        label: 'Card style',
        help: 'Transparency and material of feed cards',
        options: {
          glass: 'Glass',
          solid: 'Solid',
          outline: 'Outline',
          transparent: 'Transparent',
        },
      },
      itemCount: {
        label: 'Items per source',
        help: 'Maximum number of articles to load',
      },
      refreshInterval: {
        label: 'Auto-refresh interval',
        help: 'How often to check feeds for new articles',
        options: {
          '0': 'Manually only',
          '15': 'Every 15 minutes',
          '30': 'Every 30 minutes',
          '60': 'Every hour',
          '360': 'Every 6 hours',
        },
      },
      showThumbnails: {
        label: 'Show thumbnails',
        help: 'Load and show article cover images',
      },
      showDescription: {
        label: 'Short description',
        help: "Show the article's opening paragraph",
      },
      showSource: {
        label: 'Source name',
        help: 'Badge with the website or RSS channel name',
      },
      showSearch: {
        label: 'Live search bar',
        help: 'Quickly search articles inside the widget',
      },
      openInNewTab: {
        label: 'Open articles in a new tab',
        help: 'Read the full article in a separate tab',
      },
    },
    search: {
      searchStyle: {
        label: 'Search bar style',
        help: 'A floating capsule or classic provider tiles',
        options: {
          bar: 'Capsule',
          tiles: 'Tiles',
        },
      },
      engine: {
        label: 'Default search engine',
        help: 'Main search engine for quick queries',
        options: {
          google: 'Google',
          yandex: 'Yandex',
          duckduckgo: 'DuckDuckGo (private)',
          brave: 'Brave Search',
          bing: 'Microsoft Bing',
          perplexity: 'Perplexity AI',
          chatgpt: 'ChatGPT',
          claude: 'Claude AI',
          github: 'GitHub Code Search',
          youtube: 'YouTube Video',
        },
      },
      showEngineSelector: {
        label: 'Quick engine switch',
        help: 'Engine icon with a switch menu right in the bar',
      },
      showHotkeyBadge: {
        label: 'Hotkey hint [/]',
        help: 'Badge showing that the slash key focuses search',
      },
      placeholder: {
        label: 'Placeholder text',
        help: 'Custom text in the empty search bar',
        placeholder: 'Search the web or type a URL...',
      },
      openInNewTab: {
        label: 'Open results in a new tab',
        help: 'Keep the dashboard open when searching',
      },
      autoFocus: {
        label: 'Autofocus on new tab',
        help: 'Put the cursor in the search field on start',
      },
    },
    systemMonitor: {
      layoutStyle: {
        label: 'Layout',
        help: 'Card grid or detailed horizontal progress bars',
        options: {
          grid: 'Grid',
          bars: 'Bars',
        },
      },
      showMemory: {
        label: 'JS heap memory',
        help: 'Memory used by the tab and browser',
      },
      showBattery: {
        label: 'Battery level',
        help: 'Battery percentage and charging indicator',
      },
      showNetwork: {
        label: 'Network connection',
        help: 'Online/offline status and connection type (RTT/speed)',
      },
      showTabs: {
        label: 'Open tabs counter',
        help: 'Number of tabs in the current browser window',
      },
      refreshInterval: {
        label: 'Sensor polling rate',
        help: 'Telemetry refresh interval (in seconds)',
        options: {
          '1': 'Every second (1 s)',
          '2': 'Every 2 seconds (2 s)',
          '5': 'Every 5 seconds (5 s)',
          '10': 'Every 10 seconds (10 s)',
        },
      },
    },
    todo: {
      defaultTab: {
        label: 'Default tab',
        help: 'Section shown on open: task list or habit tracker',
        options: {
          todos: 'Tasks',
          habits: 'Habits',
        },
      },
      sortBy: {
        label: 'Sort tasks',
        help: 'Order of tasks in the list',
        options: {
          date: 'By date added (newest first)',
          priority: 'By priority (High → Low)',
          text: 'Alphabetically (A–Z)',
        },
      },
      filter: {
        label: 'Display filter',
        help: 'Which tasks to show by default',
        options: {
          all: 'All tasks',
          active: 'Active only',
          completed: 'Completed only',
        },
      },
      hideCompleted: {
        label: 'Hide completed tasks',
        help: 'Remove completed tasks from the active list automatically',
      },
      defaultPriority: {
        label: 'New task priority',
        help: 'Initial priority when adding a task quickly',
        options: {
          low: 'Low',
          medium: 'Medium',
          high: 'High',
        },
      },
      showProgress: {
        label: 'Daily progress bar',
        help: 'Show the percentage and bar of completed tasks',
      },
      density: {
        label: 'List density',
        help: 'Compact for many tasks, or comfortable',
        options: {
          comfortable: 'Comfortable',
          compact: 'Compact',
        },
      },
    },
    weather: {
      city: {
        label: 'City',
        help: 'City for the Open-Meteo forecast',
      },
      viewMode: {
        label: 'Display mode',
        help: 'Widget layout: weather station, compact, or detailed timelines',
        options: {
          dashboard: 'Weather station',
          compact: 'Compact',
          hourly: '24 hours',
          weekly: '7 days',
        },
      },
      tempUnit: {
        label: 'Temperature scale',
        help: 'Air temperature units',
        options: {
          celsius: '°C (Celsius)',
          fahrenheit: '°F (Fahrenheit)',
        },
      },
      windSpeedUnit: {
        label: 'Wind speed',
        help: 'Wind speed units',
        options: {
          ms: 'm/s (meters per second)',
          kmh: 'km/h (kilometers per hour)',
          mph: 'mph (miles per hour)',
        },
      },
      pressureUnit: {
        label: 'Air pressure',
        help: 'Atmospheric pressure units',
        options: {
          mmhg: 'mmHg (millimeters of mercury)',
          hpa: 'hPa (hectopascals / mbar)',
        },
      },
      showMetrics: {
        label: 'Detailed weather factors',
        help: 'Show humidity, pressure, wind and UV index cards',
      },
      showSunTimes: {
        label: 'Sunrise and sunset',
        help: 'Show sunrise and dusk times',
      },
    },
    yearProgress: {
      defaultMode: {
        label: 'Time scale',
        help: 'Progress period: year, quarter, month, week or day',
        options: {
          year: 'Year',
          quarter: 'Quarter',
          month: 'Month',
          week: 'Week',
          day: 'Day',
        },
      },
      progressStyle: {
        label: 'Indicator style',
        help: 'Compact rounded capsule or full-width bar',
        options: {
          pill: 'Capsule',
          bar: 'Bar',
        },
      },
      gradient: {
        label: 'Color palette',
        help: 'Gradient used to fill the progress bar',
        options: {
          'cyan-indigo': 'Cyber Cyan → Indigo (signature)',
          emerald: 'Emerald Forest (green)',
          sunset: 'Sunset Coral',
          amber: 'Amber Gold',
        },
      },
      showPercentage: {
        label: 'Show percentage',
        help: 'Numeric percentage to one decimal place',
      },
      showRemainingDays: {
        label: 'Show time remaining',
        help: 'Days or hours left until the end of the period',
      },
    },
  },
};
