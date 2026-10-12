using AutoFix.Models;
using AutoFix.Services;
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using Xunit;

namespace AutoFix.Tests
{
    public class FormDraftTests
    {
        [Fact]
        public async Task FormDraft_SaveAndRetrieve_ReturnsCorrectDraft()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var draftService = new DraftService(db);

                var saved = await draftService.SaveDraftAsync(
                    "user1", 
                    "quick_add_customer", 
                    "{\"fullName\":\"Hassan Ali\",\"phone\":\"01012345678\"}");

                Assert.Equal("quick_add_customer", saved.FormKey);
                Assert.Contains("Hassan Ali", saved.FormDataJson);

                var fetched = await draftService.GetDraftAsync("user1", "quick_add_customer");
                Assert.NotNull(fetched);
                Assert.Equal("quick_add_customer", fetched!.FormKey);
                Assert.Contains("01012345678", fetched.FormDataJson);
            }
        }

        [Fact]
        public async Task FormDraft_UserIsolation_OtherUsersCannotAccessDraft()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var draftService = new DraftService(db);

                await draftService.SaveDraftAsync(
                    "admin", 
                    "work_order_create", 
                    "{\"customerComplaint\":\"Engine rattle\"}");

                // Other user queries same formKey
                var otherUserDraft = await draftService.GetDraftAsync("mechanic1", "work_order_create");
                Assert.Null(otherUserDraft);

                // Admin queries own draft
                var adminDraft = await draftService.GetDraftAsync("admin", "work_order_create");
                Assert.NotNull(adminDraft);
                Assert.Contains("Engine rattle", adminDraft!.FormDataJson);
            }
        }

        [Fact]
        public async Task FormDraft_SaveAgain_UpdatesExistingDraftWithoutDuplicates()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var draftService = new DraftService(db);

                await draftService.SaveDraftAsync("user1", "quick_add", "{\"phone\":\"01011112222\"}");
                await draftService.SaveDraftAsync("user1", "quick_add", "{\"phone\":\"01099998888\",\"fullName\":\"Updated\"}");

                var count = await db.FormDrafts.CountAsync(d => d.UserId == "user1" && d.FormKey == "quick_add");
                Assert.Equal(1, count);

                var draft = await draftService.GetDraftAsync("user1", "quick_add");
                Assert.NotNull(draft);
                Assert.Contains("01099998888", draft!.FormDataJson);
                Assert.Contains("Updated", draft.FormDataJson);
            }
        }

        [Fact]
        public async Task FormDraft_Delete_RemovesDraftCleanly()
        {
            var (db, dataFolder, conn) = TestHelper.CreateTestContext();
            using (conn)
            using (db)
            {
                var draftService = new DraftService(db);

                await draftService.SaveDraftAsync("user1", "inspection_form", "{\"score\":85}");
                var deleted = await draftService.DeleteDraftAsync("user1", "inspection_form");
                Assert.True(deleted);

                var fetched = await draftService.GetDraftAsync("user1", "inspection_form");
                Assert.Null(fetched);

                // Deleting non-existent draft returns false
                var deleteAgain = await draftService.DeleteDraftAsync("user1", "inspection_form");
                Assert.False(deleteAgain);
            }
        }
    }
}
