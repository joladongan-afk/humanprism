import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CsChatbot } from "./components/CsChatbot";
import { ZoomControls } from "./components/ZoomControls";
import InstallPrompt from "./components/InstallPrompt";
import Home from "./pages/Home";
import SajuNew from "./pages/SajuNew";
import Plans from "./pages/Plans";
import Consult from "./pages/Consult";
import MyRoom from "./pages/MyRoom";
import AppointmentNew from "./pages/AppointmentNew";
import Admin from "./pages/Admin";
import PaymentRedirect from "./pages/PaymentRedirect";
import Compatibility from "./pages/Compatibility";
import Legal from "./pages/Legal";
import LogoPreview from "./pages/LogoPreview";
import NamingNew from "./pages/NamingNew";
import ShareNaming from "./pages/ShareNaming";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/saju/new" component={SajuNew} />
      <Route path="/plans" component={Plans} />
      <Route path="/consult/:id" component={Consult} />
      <Route path="/me" component={MyRoom} />
      <Route path="/compatibility" component={Compatibility} />
      <Route path="/naming/new" component={NamingNew} />
      <Route path="/share/:token" component={ShareNaming} />
      <Route path="/appointments/new" component={AppointmentNew} />
      <Route path="/payment/redirect" component={PaymentRedirect} />
      <Route path="/legal" component={Legal} />
      <Route path="/logo-preview" component={LogoPreview} />
      <Route path="/admin">{() => <Admin />}</Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
          <CsChatbot />
          <ZoomControls />
          <InstallPrompt />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
