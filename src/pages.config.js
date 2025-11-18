import Dashboard from './pages/Dashboard';
import Crew from './pages/Crew';
import Territories from './pages/Territories';
import Heists from './pages/Heists';
import Garage from './pages/Garage';
import Auction from './pages/Auction';
import Enterprises from './pages/Enterprises';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Crew": Crew,
    "Territories": Territories,
    "Heists": Heists,
    "Garage": Garage,
    "Auction": Auction,
    "Enterprises": Enterprises,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};