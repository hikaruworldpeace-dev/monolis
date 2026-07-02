import MonolisApp from "../../../components/MonolisApp";

export default function TripInvitePage({ params }) {
  return <MonolisApp initialTripId={params.id} />;
}
