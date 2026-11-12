// Refund window, from BR-REFUND-001. The citation lives in RefundPolicy.citations.yml.
namespace DemoShop.Refunds;

public static class RefundPolicy
{
    public const int RefundWindowDays = 30;

    public static bool RefundAccepted(DateOnly deliveredOn, DateOnly requestedOn) =>
        requestedOn.DayNumber - deliveredOn.DayNumber <= RefundWindowDays;
}
