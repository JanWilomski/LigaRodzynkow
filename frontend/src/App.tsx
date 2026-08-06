import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Layout } from '@/components/Layout'
import { RankingPage } from '@/pages/RankingPage'
import { PlayersPage } from '@/pages/PlayersPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { LiveScorePage } from '@/pages/LiveScorePage'
import DrawPage from "@/pages/DrawPage"
import { PlayerProfilePage } from "@/pages/PlayerProfilePage"
import { RemoteTestPage } from '@/pages/RemoteTestPage'
import { ToastProvider } from '@/components/ui/Toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s - dane są świeże przez pół minuty
      refetchOnWindowFocus: false,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<RankingPage />} />
              <Route path="players" element={<PlayersPage />} />
              <Route path="history" element={<HistoryPage />} />
              <Route path="draw" element={<DrawPage />} />
              <Route path="players/:id" element={<PlayerProfilePage />} />
              <Route path="live" element={<LiveScorePage />} />
              <Route path="test" element={<RemoteTestPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
